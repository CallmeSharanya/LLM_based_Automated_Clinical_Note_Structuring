"""
Authentication Module for Clinical EHR System
Handles user authentication for Patients, Doctors, and Hospital Admins
"""

import os
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum

from fastapi import HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr


def calculate_age(date_of_birth: str) -> Optional[int]:
    """Calculate age from date of birth string (YYYY-MM-DD format)"""
    if not date_of_birth:
        return None
    try:
        dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    except (ValueError, TypeError):
        return None

# In production, use a proper database. For demo, using in-memory storage.


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    HOSPITAL = "hospital"


@dataclass
class User:
    id: str
    email: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    password_hash: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    profile: Dict[str, Any] = field(default_factory=dict)
    token: Optional[str] = None


class LoginRequest(BaseModel):
    id: str  # Can be email for patients or UUID for doctors
    password: str
    role: str


class PatientSignupRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    password: str
    role: str = "patient"
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[Dict] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None
    address: Optional[Dict] = None


class QuickSignupRequest(BaseModel):
    phone: str
    name: Optional[str] = "Emergency Patient"
    role: str = "patient"
    is_emergency: bool = False


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile: Optional[Dict] = None


class AuthManager:
    """Manages user authentication and sessions"""
    
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.tokens: Dict[str, str] = {}  # token -> user_id
        self._init_demo_users()
    
    def _hash_password(self, password: str) -> str:
        """Hash password with salt"""
        salt = "clinical_ehr_salt_2026"  # In production, use proper salt per user
        return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
    
    def _generate_token(self) -> str:
        """Generate a secure session token"""
        return secrets.token_urlsafe(32)
    
    def _init_demo_users(self):
        """Initialize demo users for testing"""
        demo_users = [
            {
                "id": "demo-patient-1",
                "email": "patient@demo.com",
                "name": "John Doe",
                "role": UserRole.PATIENT,
                "phone": "+91 9876543210",
                "password": "demo123",
                "profile": {
                    "age": 35,
                    "blood_group": "O+",
                    "allergies": ["Penicillin"],
                    "chronic_conditions": ["Hypertension"],
                }
            },
            {
                "id": "doc-001",
                "email": "doctor@demo.com",
                "name": "Dr. Priya Sharma",
                "role": UserRole.DOCTOR,
                "phone": "+91 9876543211",
                "password": "demo123",
                "profile": {
                    "specialty": "Cardiology",
                    "subspecialty": "Interventional Cardiology",
                    "experience_years": 15,
                    "qualifications": ["MBBS", "MD", "DM Cardiology"],
                }
            },
            {
                "id": "hospital-1",
                "email": "admin@hospital.com",
                "name": "City Hospital Admin",
                "role": UserRole.HOSPITAL,
                "phone": "+91 9876543212",
                "password": "demo123",
                "profile": {
                    "hospital_name": "City General Hospital",
                    "hospital_id": "CGH001",
                }
            },
        ]
        
        for user_data in demo_users:
            user = User(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data["name"],
                role=user_data["role"],
                phone=user_data.get("phone"),
                password_hash=self._hash_password(user_data["password"]),
                profile=user_data.get("profile", {}),
            )
            self.users[user.id] = user
    
    def login(self, user_id: str, password: str, role: str) -> Dict[str, Any]:
        """Authenticate user and return token"""
        
        password_hash = self._hash_password(password)
        
        # For doctors, check Supabase doctors table
        if role == "doctor":
            try:
                from supabase_client import get_supabase_client
                supabase = get_supabase_client()
                
                # Query doctor by email first, then by ID (UUID)
                response = supabase.table("doctors").select("*").eq("email", user_id).execute()
                if not response.data:
                    # Try by ID if email didn't match
                    response = supabase.table("doctors").select("*").eq("id", user_id).execute()
                
                if response.data and len(response.data) > 0:
                    doctor = response.data[0]
                    
                    # Check password
                    stored_hash = doctor.get("password_hash", "").strip()
                    password_hash = password_hash.strip()
                    
                    if stored_hash and stored_hash == password_hash:
                        # Generate token
                        token = self._generate_token()
                        self.tokens[token] = user_id
                        
                        return {
                            "success": True,
                            "user": {
                                "id": doctor.get("id"),  # Use database UUID, not login email
                                "email": doctor.get("email", ""),
                                "name": doctor.get("name"),
                                "role": "doctor",
                                "phone": doctor.get("phone"),
                                "token": token,
                                "specialty": doctor.get("specialty"),
                                "subspecialty": doctor.get("subspecialty"),
                                "experience_years": doctor.get("experience_years"),
                                "qualifications": doctor.get("qualifications", []),
                                "rating": doctor.get("rating"),
                            },
                            "message": "Login successful"
                        }
                    else:
                        raise HTTPException(status_code=401, detail="Invalid password")
                else:
                    # Doctor not found in Supabase, fall back to local
                    pass
                    
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠️ Supabase doctor login error: {e}, falling back to local auth")
        
        # For patients, check Supabase first
        if role == "patient":
            try:
                from supabase_client import get_supabase_client
                supabase = get_supabase_client()
                
                # Query patient by email (user_id is email for patients)
                response = supabase.table("patients").select("*").eq("email", user_id).execute()
                if response.data and len(response.data) > 0:
                    patient = response.data[0]
                    
                    # Check password
                    stored_hash = patient.get("password_hash", "")
                    if stored_hash and stored_hash == password_hash:
                        # Generate token
                        token = self._generate_token()
                        patient_id = f"patient-{patient.get('email', '')}"
                        self.tokens[token] = patient_id
                        
                        # Calculate age from date_of_birth
                        dob_str = patient.get("date_of_birth")
                        patient_age = calculate_age(str(dob_str) if dob_str else None)
                        
                        return {
                            "success": True,
                            "user": {
                                "id": patient_id,
                                "email": patient.get("email"),
                                "name": patient.get("name"),
                                "role": "patient",
                                "phone": patient.get("phone"),
                                "token": token,
                                "date_of_birth": patient.get("date_of_birth"),
                                "age": patient_age,
                                "gender": patient.get("gender"),
                                "blood_group": patient.get("blood_group"),
                                "allergies": patient.get("allergies", []),
                                "chronic_conditions": patient.get("chronic_conditions", []),
                                "current_medications": patient.get("current_medications", []),
                            },
                            "message": "Login successful"
                        }
                    else:
                        raise HTTPException(status_code=401, detail="Invalid password")
                else:
                    # Patient not found in Supabase, fall back to local
                    pass
                    
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠️ Supabase login error: {e}, falling back to local auth")
        
        # Fall back to local authentication (for demo users)
        user = None
        for u in self.users.values():
            # Check by email or ID
            if (u.email == user_id or u.id == user_id) and u.role.value == role:
                user = u
                break
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid ID or role")
        
        if user.password_hash != password_hash:
            raise HTTPException(status_code=401, detail="Invalid password")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Generate token
        token = self._generate_token()
        self.tokens[token] = user.id
        user.token = token
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "phone": user.phone,
                "token": token,
                **user.profile,
            },
            "message": "Login successful"
        }
    
    def signup(self, data: PatientSignupRequest) -> Dict[str, Any]:
        """Register a new patient"""
        
        # Check if email already exists
        if data.email:
            for u in self.users.values():
                if u.email == data.email:
                    raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if phone already exists
        for u in self.users.values():
            if u.phone == data.phone:
                raise HTTPException(status_code=400, detail="Phone number already registered")
        
        # Create user
        user_id = f"patient-{uuid.uuid4().hex[:8]}"
        
        user = User(
            id=user_id,
            email=data.email or f"{data.phone}@temp.ehr",
            name=data.name,
            role=UserRole.PATIENT,
            phone=data.phone,
            password_hash=self._hash_password(data.password),
            profile={
                "date_of_birth": data.date_of_birth,
                "gender": data.gender,
                "blood_group": data.blood_group,
                "emergency_contact": data.emergency_contact,
                "allergies": data.allergies or [],
                "chronic_conditions": data.chronic_conditions or [],
                "current_medications": data.current_medications or [],
                "address": data.address,
            }
        )
        
        self.users[user.id] = user
        
        # Insert patient into Supabase
        try:
            from supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Prepare patient data for Supabase
            patient_email = data.email or f"{data.phone}@temp.ehr"
            patient_data = {
                "patient_id": patient_email,  # Required unique identifier
                "email": patient_email,
                "name": data.name,
                "phone": data.phone,
                "password_hash": self._hash_password(data.password),  # Store hashed password for login
                "date_of_birth": data.date_of_birth,
                "gender": data.gender,
                "blood_group": data.blood_group,
                "address": {"full": data.address.get("full", "") if isinstance(data.address, dict) else (data.address or "")} if data.address else None,
                "emergency_contact": {"phone": data.emergency_contact.get("phone", "")} if isinstance(data.emergency_contact, dict) else None,
                "allergies": data.allergies or [],
                "chronic_conditions": data.chronic_conditions or [],
                "current_medications": data.current_medications or []
            }
            
            # Insert into patients table
            supabase.table("patients").insert(patient_data).execute()
            print(f"✅ Patient {data.email} inserted into Supabase")
            
        except Exception as e:
            print(f"⚠️ Warning: Could not insert patient into Supabase: {e}")
            # Continue with local registration even if Supabase fails
        
        # Auto-login
        token = self._generate_token()
        self.tokens[token] = user.id
        user.token = token
        
        # Calculate age from date_of_birth
        patient_age = calculate_age(data.date_of_birth)
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "phone": user.phone,
                "token": token,
                "age": patient_age,
                **user.profile,
            },
            "message": "Registration successful"
        }
    
    def quick_signup(self, data: QuickSignupRequest) -> Dict[str, Any]:
        """Quick registration for emergency patients"""
        
        # Check if phone already exists
        for u in self.users.values():
            if u.phone == data.phone:
                # Return existing user
                token = self._generate_token()
                self.tokens[token] = u.id
                return {
                    "success": True,
                    "user": {
                        "id": u.id,
                        "email": u.email,
                        "name": u.name,
                        "role": u.role.value,
                        "phone": u.phone,
                        "token": token,
                        **u.profile,
                    },
                    "message": "Welcome back",
                    "existing_user": True
                }
        
        # Create minimal user
        user_id = f"emergency-{uuid.uuid4().hex[:8]}"
        temp_password = secrets.token_urlsafe(8)
        
        user = User(
            id=user_id,
            email=f"{data.phone}@emergency.ehr",
            name=data.name,
            role=UserRole.PATIENT,
            phone=data.phone,
            password_hash=self._hash_password(temp_password),
            profile={
                "is_emergency": data.is_emergency,
                "temp_password": temp_password,  # In production, send via SMS
            }
        )
        
        self.users[user.id] = user
        
        # Insert emergency patient into Supabase
        try:
            from supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            patient_data = {
                "email": f"{data.phone}@emergency.ehr",
                "name": data.name,
                "phone": data.phone,
                "allergies": [],
                "chronic_conditions": [],
                "current_medications": []
            }
            
            supabase.table("patients").insert(patient_data).execute()
            print(f"✅ Emergency patient {data.phone} inserted into Supabase")
            
        except Exception as e:
            print(f"⚠️ Warning: Could not insert emergency patient into Supabase: {e}")
        
        token = self._generate_token()
        self.tokens[token] = user.id
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "name": user.name,
                "role": user.role.value,
                "phone": user.phone,
                "token": token,
                "is_emergency": data.is_emergency,
            },
            "message": "Quick registration successful",
            "temp_password": temp_password  # In production, send via SMS only
        }
    
    def get_user_by_token(self, token: str) -> Optional[User]:
        """Get user from token"""
        user_id = self.tokens.get(token)
        if user_id:
            return self.users.get(user_id)
        return None
    
    def get_current_user(self, authorization: str = Header(None)) -> User:
        """Dependency for getting current user from auth header"""
        if not authorization:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token from "Bearer <token>"
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = parts[1]
        user = self.get_user_by_token(token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        return user
    
    def update_profile(self, user_id: str, updates: ProfileUpdateRequest) -> Dict[str, Any]:
        """Update user profile"""
        user = self.users.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if updates.name:
            user.name = updates.name
        if updates.phone:
            user.phone = updates.phone
        if updates.profile:
            user.profile.update(updates.profile)
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "phone": user.phone,
                **user.profile,
            },
            "message": "Profile updated"
        }
    
    def logout(self, token: str) -> Dict[str, Any]:
        """Logout user by invalidating token"""
        if token in self.tokens:
            del self.tokens[token]
        return {"success": True, "message": "Logged out"}


# Create global auth manager instance
auth_manager = AuthManager()
