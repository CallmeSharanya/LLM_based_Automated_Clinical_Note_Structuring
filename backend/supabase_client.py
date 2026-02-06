"""
Supabase Client for Doctor and Appointment Management
Handles doctor fetching, appointment booking, and availability updates
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
import secrets
import pydantic


# Initialize Supabase client
def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
    
    return create_client(url, key)


def get_doctors_from_supabase(specialty: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all doctors from Supabase, optionally filtered by specialty
    """
    supabase = get_supabase_client()
    
    query = supabase.table("doctors").select("*")
    
    if specialty:
        query = query.ilike("specialty", f"%{specialty}%")
    
    response = query.execute()
    
    return response.data if response.data else []


def get_doctor_by_id(doctor_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a specific doctor by ID
    """
    supabase = get_supabase_client()
    
    response = supabase.table("doctors").select("*").eq("id", doctor_id).single().execute()
    
    return response.data


def parse_availability_to_slots(availability: Dict, num_days: int = 7) -> List[Dict[str, str]]:
    """
    Parse doctor's availability JSONB to generate actual time slots
    
    Args:
        availability: JSONB like {"monday": ["09:00-13:00", "14:00-17:00"], ...}
        num_days: Number of days ahead to generate slots for
    
    Returns:
        List of slots like [{"date": "2026-01-22", "day": "Wednesday", "time": "09:00-10:00"}, ...]
    """
    if not availability:
        return []
    
    slots = []
    today = datetime.now()
    
    day_mapping = {
        0: "monday",
        1: "tuesday",
        2: "wednesday",
        3: "thursday",
        4: "friday",
        5: "saturday",
        6: "sunday"
    }
    
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for i in range(num_days):
        target_date = today + timedelta(days=i)
        day_key = day_mapping[target_date.weekday()]
        day_name = day_names[target_date.weekday()]
        date_str = target_date.strftime("%Y-%m-%d")
        
        # Get availability for this day
        day_slots = availability.get(day_key, [])
        
        for time_range in day_slots:
            # Parse time range like "09:00-13:00"
            if "-" in time_range:
                start_time, end_time = time_range.split("-")
                
                # Generate hourly slots within this range
                try:
                    start_hour = int(start_time.split(":")[0])
                    end_hour = int(end_time.split(":")[0])
                    
                    for hour in range(start_hour, end_hour):
                        slot_time = f"{hour:02d}:00-{hour+1:02d}:00"
                        
                        # Don't show past time slots for today
                        if i == 0 and hour <= today.hour:
                            continue
                        
                        slots.append({
                            "date": date_str,
                            "day": day_name,
                            "time": slot_time,
                            "display": f"{day_name}, {target_date.strftime('%b %d')} at {hour:02d}:00"
                        })
                except (ValueError, IndexError):
                    continue
    
    return slots


def book_appointment(
    patient_id: str,
    doctor_id: str,
    appointment_date: str,
    appointment_time: str,
    specialty: str,
    session_id: Optional[str] = None,
    appointment_type: str = "Consultation"
) -> Dict[str, Any]:
    """
    Book an appointment:
    1. Create appointment record in appointments table
    2. Update doctor's availability JSONB (remove booked slot)
    3. Increment doctor's current_load
    """
    supabase = get_supabase_client()
    print(patient_id, doctor_id, appointment_date, appointment_time, specialty, session_id, appointment_type)
    patient_id = patient_id.replace("patient-", "") if patient_id.startswith("patient-") else patient_id
    # Get doctor details first
    doctor = get_doctor_by_id(doctor_id)
    print("Doctor", doctor)
    if not doctor:
        return {"success": False, "error": "Doctor not found"}
    
    # Generate unique int64 ID
    appointment_id = secrets.randbits(64)
    
    # Timings as JSONB object
    timings = {
        "date": appointment_date,
        "time": appointment_time
    }
    
    # Create appointment record
    appointment_data = {
        "doctor_id": doctor_id,
        "patient_id": patient_id,  # Patient's email
        "timings": timings,  # JSONB column
        "specialty": specialty,
        "appointment_type": appointment_type
    }
    print("Appointment Data", appointment_data)
    
    try:
        # Insert appointment (Supabase auto-handles JSONB)
        appointment_response = supabase.table("appointments").insert(appointment_data).execute()
        
        if not appointment_response.data:
            return {"success": False, "error": "Failed to create appointment"}
        
        # Update doctor's availability - remove the booked slot
        success = update_doctor_availability(doctor_id, appointment_date, appointment_time, doctor)
        
        if not success:
            print(f"Warning: Could not update doctor availability for {doctor_id}")
        
        # Increment doctor's current_load
        increment_doctor_load(doctor_id, doctor)
        
        return {
            "success": True,
            "appointment": {
                "id": appointment_id,  # Use generated ID directly
                "doctor_id": doctor_id,
                "patient_id": patient_id,
                "timings": timings,
                "doctor_name": doctor.get("name", "Doctor"),
                "specialty": specialty,
                "appointment_type": appointment_type
            },
            "message": f"Appointment booked successfully with {doctor.get('name', 'Doctor')}"
        }
        
    except Exception as e:
        print(f"Error booking appointment: {e}")
        return {"success": False, "error": str(e)}

def update_doctor_availability(
    doctor_id: str, 
    appointment_date: str, 
    appointment_time: str,
    doctor: Optional[Dict] = None
) -> bool:
    """
    Update doctor's availability JSONB by removing the booked slot
    
    Args:
        doctor_id: Doctor's ID
        appointment_date: Date of appointment (YYYY-MM-DD)
        appointment_time: Time slot booked (e.g., "10:00-11:00")
        doctor: Optional pre-fetched doctor data
    """
    supabase = get_supabase_client()
    
    try:
        if not doctor:
            doctor = get_doctor_by_id(doctor_id)
        
        if not doctor:
            return False
        
        availability = doctor.get("availability", {})
        if not availability:
            return True  # No availability to update
        
        # Parse the appointment date to get day of week
        date_obj = datetime.strptime(appointment_date, "%Y-%m-%d")
        day_mapping = {
            0: "monday", 1: "tuesday", 2: "wednesday", 
            3: "thursday", 4: "friday", 5: "saturday", 6: "sunday"
        }
        day_key = day_mapping[date_obj.weekday()]
        
        # Get current slots for this day
        day_slots = availability.get(day_key, [])
        if not day_slots:
            return True  # No slots to update
        
        # Parse the booked time (e.g., "10:00-11:00")
        booked_start = appointment_time.split("-")[0] if "-" in appointment_time else appointment_time
        booked_hour = int(booked_start.split(":")[0])
        
        # Find and update the time range that contains this slot
        new_day_slots = []
        for time_range in day_slots:
            if "-" in time_range:
                start_time, end_time = time_range.split("-")
                start_hour = int(start_time.split(":")[0])
                end_hour = int(end_time.split(":")[0])
                
                # Check if booked hour falls within this range
                if start_hour <= booked_hour < end_hour:
                    # Split the range, excluding the booked hour
                    if booked_hour > start_hour:
                        # Keep the part before the booked hour
                        new_day_slots.append(f"{start_time}-{booked_hour:02d}:00")
                    if booked_hour + 1 < end_hour:
                        # Keep the part after the booked hour
                        new_day_slots.append(f"{booked_hour + 1:02d}:00-{end_time}")
                else:
                    # Keep the original range
                    new_day_slots.append(time_range)
            else:
                new_day_slots.append(time_range)
        
        # Update availability
        availability[day_key] = new_day_slots
        
        # Save to database
        supabase.table("doctors").update({"availability": availability}).eq("id", doctor_id).execute()
        
        return True
        
    except Exception as e:
        print(f"Error updating doctor availability: {e}")
        return False


def increment_doctor_load(doctor_id: str, doctor: Optional[Dict] = None) -> bool:
    """
    Increment doctor's current_load by 1
    """
    supabase = get_supabase_client()
    
    try:
        if not doctor:
            doctor = get_doctor_by_id(doctor_id)
        
        if not doctor:
            return False
        
        current_load = doctor.get("current_load", 0)
        new_load = current_load + 1
        
        supabase.table("doctors").update({"current_load": new_load}).eq("id", doctor_id).execute()
        
        return True
        
    except Exception as e:
        print(f"Error incrementing doctor load: {e}")
        return False


def get_patient_appointments(patient_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all appointments for a patient
    Uses simplified table structure: id, doctor_id, patient_id (email), timings (JSONB)
    """
    supabase = get_supabase_client()
    
    # Extract email from patient_id if it has "patient-" prefix
    patient_email = patient_id.replace("patient-", "") if patient_id.startswith("patient-") else patient_id
    print(f"Fetching appointments for patient email: {patient_email}")
    
    try:
        # Query appointments with doctor details via FK join
        response = supabase.table("appointments")\
            .select("*, doctors(id, name, specialty, consultation_fee)")\
            .eq("patient_id", patient_email)\
            .execute()
        
        print(f"Found {len(response.data or [])} appointments")
        
        appointments = []
        for apt in response.data or []:
            doctor_info = apt.get("doctors", {}) or {}
            timings = apt.get("timings", {})
            
            # Handle timings as JSONB object
            date_part = ""
            time_part = ""
            if isinstance(timings, dict):
                date_part = timings.get("date", "")
                time_part = timings.get("time", "")
            elif isinstance(timings, str):
                # Fallback for string format
                parts = timings.split(" ", 1)
                if len(parts) >= 1:
                    date_part = parts[0]
                if len(parts) >= 2:
                    time_part = parts[1]
            
            appointments.append({
                "id": apt.get("id"),
                "doctor_id": apt.get("doctor_id"),
                "doctor_name": doctor_info.get("name", "Doctor"),
                "specialty": apt.get("specialty") or doctor_info.get("specialty", "General Medicine"),
                "date": date_part,
                "time": time_part.split("-")[0] if time_part and "-" in time_part else time_part,
                "timings": timings,
                "status": "confirmed",
                "type": apt.get("appointment_type", "Consultation"),
                "consultation_fee": doctor_info.get("consultation_fee", 0)
            })
        
        return appointments
        
    except Exception as e:
        print(f"Error fetching patient appointments: {e}")
        return []


def get_doctors_with_availability(specialty: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch doctors with their parsed availability slots
    """
    doctors = get_doctors_from_supabase(specialty)
    
    for doctor in doctors:
        availability = doctor.get("availability", {})
        doctor["available_slots"] = parse_availability_to_slots(availability)
    
    return doctors


def get_doctor_appointments(doctor_id: str, date_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all appointments for a doctor
    Args:
        doctor_id: Doctor's UUID
        date_filter: Optional date filter (YYYY-MM-DD) for today's schedule
    """
    supabase = get_supabase_client()
    
    print(f"Fetching appointments for doctor: {doctor_id}, date: {date_filter}")
    
    try:
        # Query appointments without FK join (patient_id is email, not UUID)
        query = supabase.table("appointments")\
            .select("*")\
            .eq("doctor_id", doctor_id)
        
        response = query.execute()
        
        print(f"Found {len(response.data or [])} appointments")
        
        appointments = []
        for apt in response.data or []:
            patient_id = apt.get("patient_id", "")
            timings = apt.get("timings", {})
            
            # Fetch patient info by email (patient_id is email)
            patient_name = "Patient"
            patient_email = patient_id
            patient_phone = ""
            
            try:
                patient_resp = supabase.table("patients").select("name, email, phone").eq("email", patient_id).execute()
                if patient_resp.data and len(patient_resp.data) > 0:
                    patient_info = patient_resp.data[0]
                    patient_name = patient_info.get("name", "Patient")
                    patient_email = patient_info.get("email", patient_id)
                    patient_phone = patient_info.get("phone", "")
            except Exception as pe:
                print(f"Could not fetch patient info: {pe}")
            
            # Handle timings as JSONB object
            date_part = ""
            time_part = ""
            if isinstance(timings, dict):
                date_part = timings.get("date", "")
                time_part = timings.get("time", "")
            elif isinstance(timings, str):
                parts = timings.split(" ", 1)
                if len(parts) >= 1:
                    date_part = parts[0]
                if len(parts) >= 2:
                    time_part = parts[1]
            
            # Filter by date if specified
            if date_filter and date_part != date_filter:
                continue
            
            appointments.append({
                "id": apt.get("id"),
                "patient_id": patient_id,
                "patient_name": patient_name,
                "patient_email": patient_email,
                "patient_phone": patient_phone,
                "specialty": apt.get("specialty", "General Medicine"),
                "date": date_part,
                "time": time_part,
                "timings": timings,
                "status": "confirmed",
                "type": apt.get("appointment_type", "Consultation")
            })
        
        # Sort by time
        appointments.sort(key=lambda x: x.get("time", ""))
        
        return appointments
        
    except Exception as e:
        print(f"Error fetching doctor appointments: {e}")
        return []
