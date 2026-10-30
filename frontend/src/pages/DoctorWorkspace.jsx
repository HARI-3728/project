import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import './doctor-workspace.css';

const useDoctorData = (endpoint) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    api.get(endpoint, { requireAuth: true })
      .then((response) => {
        if (isCurrent) setItems(Array.isArray(response) ? response : (response?.data || []));
      })
      .catch((error) => {
        if (isCurrent) setErrorMessage(error.message || 'Unable to load this page.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [endpoint, reloadKey]);

  return {
    items,
    isLoading,
    errorMessage,
    reload: () => {
      setIsLoading(true);
      setErrorMessage('');
      setReloadKey((key) => key + 1);
    },
  };
};

const WorkspaceHeader = ({ icon: Icon, title, description }) => (
  <header className="doctor-workspace-header">
    <div className="doctor-workspace-icon"><Icon size={22} /></div>
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  </header>
);

const WorkspaceState = ({ isLoading, errorMessage, onRetry, children }) => {
  if (isLoading) return <LoadingState count={3} type="card" />;
  if (errorMessage) {
    return (
      <ErrorState
        title="Unable to load doctor workspace"
        message={errorMessage}
        onRetry={onRetry}
      />
    );
  }
  return children;
};

const formatDate = (value) => {
  if (!value) return 'Date not listed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not listed' : date.toLocaleDateString();
};

export const DoctorAppointments = () => {
  const { items, isLoading, errorMessage, reload } = useDoctorData('/appointments/doctor');
  const [updatingId, setUpdatingId] = useState('');
  const [actionError, setActionError] = useState('');

  const completeAppointment = async (appointmentId) => {
    setUpdatingId(appointmentId);
    setActionError('');
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status: 'completed' }, { requireAuth: true });
      reload();
    } catch (error) {
      setActionError(error.message || 'Unable to update appointment.');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="doctor-workspace">
      <WorkspaceHeader
        icon={CalendarCheck}
        title="Appointments & OPD"
        description="Review and manage appointments assigned to you."
      />
      {actionError && <p className="doctor-workspace-error" role="alert">{actionError}</p>}
      <WorkspaceState isLoading={isLoading} errorMessage={errorMessage} onRetry={reload}>
        {items.length === 0 ? (
          <Card><p className="doctor-workspace-empty">No appointments found.</p></Card>
        ) : (
          <div className="doctor-workspace-list">
            {items.map((appointment) => (
              <Card className="doctor-workspace-card" key={appointment._id}>
                <div className="doctor-workspace-card-main">
                  <div>
                    <h2>{appointment.patient?.name || 'Patient'}</h2>
                    <p>{appointment.condition || 'Consultation'} · {formatDate(appointment.appointmentDate)} · {appointment.startTime || appointment.appointmentTime || 'Time not listed'}</p>
                    {appointment.patient?.phone && <p><Phone size={14} /> {appointment.patient.phone}</p>}
                  </div>
                  <span className={`doctor-workspace-status status-${appointment.status || 'pending'}`}>
                    {appointment.status || 'pending'}
                  </span>
                </div>
                {appointment.notes && <p className="doctor-workspace-detail">{appointment.notes}</p>}
                {['pending', 'confirmed'].includes(appointment.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={CheckCircle2}
                    isLoading={updatingId === appointment._id}
                    onClick={() => completeAppointment(appointment._id)}
                  >
                    Mark complete
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </WorkspaceState>
    </div>
  );
};

export const DoctorPrescriptions = () => {
  const { items, isLoading, errorMessage, reload } = useDoctorData('/prescriptions/doctor');

  return (
    <div className="doctor-workspace">
      <WorkspaceHeader
        icon={FileText}
        title="Prescriptions"
        description="Prescriptions you have issued to your patients."
      />
      <WorkspaceState isLoading={isLoading} errorMessage={errorMessage} onRetry={reload}>
        {items.length === 0 ? (
          <Card><p className="doctor-workspace-empty">No prescriptions issued yet.</p></Card>
        ) : (
          <div className="doctor-workspace-list">
            {items.map((prescription) => (
              <Card className="doctor-workspace-card" key={prescription._id}>
                <div className="doctor-workspace-card-main">
                  <div>
                    <h2>{prescription.patient?.name || 'Patient'}</h2>
                    <p>{prescription.diagnosis || 'Diagnosis not recorded'} · {formatDate(prescription.createdAt)}</p>
                  </div>
                </div>
                <ul className="doctor-workspace-medicines">
                  {(prescription.medicines || []).map((medicine, index) => (
                    <li key={`${medicine.medicineName}-${index}`}>
                      <strong>{medicine.medicineName}</strong>
                      {[medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(' · ')}
                    </li>
                  ))}
                </ul>
                {prescription.notes && <p className="doctor-workspace-detail">{prescription.notes}</p>}
              </Card>
            ))}
          </div>
        )}
      </WorkspaceState>
    </div>
  );
};

export const DoctorPatients = () => {
  const { items, isLoading, errorMessage, reload } = useDoctorData('/appointments/doctor');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientProfile, setPatientProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const profileRequestId = useRef(0);
  const patients = [...new Map(
    items
      .filter((appointment) => appointment.patient?._id)
      .map((appointment) => [appointment.patient._id, appointment.patient])
  ).values()];

  const openPatientRecord = async (patientId) => {
    if (selectedPatientId === patientId) {
      profileRequestId.current += 1;
      setSelectedPatientId('');
      setPatientProfile(null);
      setProfileError('');
      return;
    }

    const requestId = profileRequestId.current + 1;
    profileRequestId.current = requestId;
    setSelectedPatientId(patientId);
    setPatientProfile(null);
    setProfileError('');
    setIsLoadingProfile(true);
    try {
      const profile = await api.get(`/patients/${patientId}`, { requireAuth: true });
      if (profileRequestId.current === requestId) setPatientProfile(profile);
    } catch (error) {
      if (profileRequestId.current === requestId) {
        setProfileError(error.message || 'Unable to load this patient profile.');
      }
    } finally {
      if (profileRequestId.current === requestId) setIsLoadingProfile(false);
    }
  };

  return (
    <div className="doctor-workspace">
      <WorkspaceHeader
        icon={History}
        title="Patient Records"
        description="Patients and visit details from appointments assigned to you."
      />
      <WorkspaceState isLoading={isLoading} errorMessage={errorMessage} onRetry={reload}>
        {patients.length === 0 ? (
          <Card><p className="doctor-workspace-empty">No appointment-linked patient records found.</p></Card>
        ) : (
          <div className="doctor-workspace-list">
            {patients.map((patient) => {
              const visits = items.filter((appointment) => appointment.patient?._id === patient._id);
              const lastVisit = visits[0];
              return (
                <Card className="doctor-workspace-card" key={patient._id}>
                  <div className="doctor-workspace-card-main">
                    <div>
                      <h2>{patient.name || 'Patient'}</h2>
                      {patient.email && <p><Mail size={14} /> {patient.email}</p>}
                      {patient.phone && <p><Phone size={14} /> {patient.phone}</p>}
                    </div>
                    <span className="doctor-workspace-status">{visits.length} {visits.length === 1 ? 'visit' : 'visits'}</span>
                  </div>
                  <p className="doctor-workspace-detail">
                    Latest visit: {lastVisit?.condition || 'Consultation'} · {formatDate(lastVisit?.appointmentDate)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openPatientRecord(patient._id)}
                  >
                    {selectedPatientId === patient._id ? 'Hide patient record' : 'View patient record'}
                  </Button>
                  {selectedPatientId === patient._id && (
                    <div className="doctor-patient-record">
                      {isLoadingProfile && <p>Loading patient profile...</p>}
                      {profileError && <p className="doctor-workspace-error" role="alert">{profileError}</p>}
                      {patientProfile && (
                        <>
                          <h3>Patient profile</h3>
                          <p>Blood group: {patientProfile.bloodGroup || 'Not listed'}</p>
                          <p>Gender: {patientProfile.gender || 'Not listed'}</p>
                          <p>Date of birth: {formatDate(patientProfile.dateOfBirth)}</p>
                          <p>Allergies: {patientProfile.allergies?.join(', ') || 'None listed'}</p>
                          <p>Chronic conditions: {patientProfile.chronicConditions?.join(', ') || 'None listed'}</p>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </WorkspaceState>
    </div>
  );
};

export const DoctorNetwork = () => {
  const { items, isLoading, errorMessage, reload } = useDoctorData('/hospital?page=1&limit=50');

  return (
    <div className="doctor-workspace">
      <WorkspaceHeader
        icon={Building2}
        title="Hospitals & Network"
        description="Browse hospitals and healthcare facilities in the MediCare+ directory."
      />
      <WorkspaceState isLoading={isLoading} errorMessage={errorMessage} onRetry={reload}>
        {items.length === 0 ? (
          <Card><p className="doctor-workspace-empty">No hospitals are currently listed.</p></Card>
        ) : (
          <div className="doctor-workspace-list">
            {items.map((hospital) => (
              <Card className="doctor-workspace-card" key={hospital._id}>
                <div className="doctor-workspace-card-main">
                  <div>
                    <h2>{hospital.hospitalName || 'Healthcare facility'}</h2>
                    <p>{hospital.type?.replaceAll('_', ' ') || 'Hospital'}</p>
                  </div>
                </div>
                {(hospital.address?.city || hospital.address?.state) && (
                  <p className="doctor-workspace-detail">
                    <MapPin size={14} /> {[hospital.address.city, hospital.address.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {hospital.phone && <p className="doctor-workspace-detail"><Phone size={14} /> {hospital.phone}</p>}
                {hospital.email && <p className="doctor-workspace-detail"><Mail size={14} /> {hospital.email}</p>}
                {hospital.departments?.length > 0 && (
                  <p className="doctor-workspace-detail">Departments: {hospital.departments.join(', ')}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </WorkspaceState>
    </div>
  );
};
