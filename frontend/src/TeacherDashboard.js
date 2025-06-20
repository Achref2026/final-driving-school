import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeacherDashboard = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolSessions, setSchoolSessions] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  // Modal states
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showStudentAssignModal, setShowStudentAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'male',
    password: '',
    can_teach_male: true,
    can_teach_female: true
  });

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    state: '',
    phone: '',
    email: '',
    description: '',
    price: 0
  });

  const [sessionForm, setSessionForm] = useState({
    student_id: '',
    teacher_id: '',
    session_type: 'theory',
    scheduled_at: '',
    duration_minutes: 60,
    location: ''
  });

  const [states] = useState([
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", 
    "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", 
    "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", 
    "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", 
    "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi", 
    "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", 
    "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", 
    "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane"
  ]);

  useEffect(() => {
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data in parallel
      const [
        sessionsRes,
        teachersRes,
        studentsRes,
        schoolInfoRes,
        schoolSessionsRes,
        enrollmentsRes
      ] = await Promise.allSettled([
        axios.get(`${API}/sessions/my`, { headers }),
        axios.get(`${API}/teachers/my`, { headers }),
        axios.get(`${API}/manager/enrollments`, { headers }),
        axios.get(`${API}/dashboard`, { headers }),
        axios.get(`${API}/sessions/school`, { headers }),
        axios.get(`${API}/manager/enrollments`, { headers })
      ]);

      // Handle sessions
      if (sessionsRes.status === 'fulfilled') {
        setSessions(sessionsRes.value.data.sessions || []);
      }

      // Handle teachers
      if (teachersRes.status === 'fulfilled') {
        setTeachers(teachersRes.value.data.teachers || []);
      }

      // Handle students (from enrollments)
      if (studentsRes.status === 'fulfilled') {
        const enrollmentData = studentsRes.value.data.enrollments || [];
        setEnrollments(enrollmentData);
        
        // Extract students from enrollments
        const studentList = enrollmentData.map(enrollment => ({
          id: enrollment.student_id,
          name: enrollment.student_name,
          email: enrollment.student_email,
          phone: enrollment.student_phone,
          enrollment_id: enrollment.id,
          enrollment_status: enrollment.enrollment_status,
          documents_verified: enrollment.documents_verified
        }));
        setStudents(studentList);
      }

      // Handle school info
      if (schoolInfoRes.status === 'fulfilled') {
        const dashboardData = schoolInfoRes.value.data;
        if (dashboardData.user_school) {
          setSchoolInfo(dashboardData.user_school);
          setSchoolForm({
            name: dashboardData.user_school.name || '',
            address: dashboardData.user_school.address || '',
            state: dashboardData.user_school.state || '',
            phone: dashboardData.user_school.phone || '',
            email: dashboardData.user_school.email || '',
            description: dashboardData.user_school.description || '',
            price: dashboardData.user_school.price || 0
          });
        }
      }

      // Handle school sessions
      if (schoolSessionsRes.status === 'fulfilled') {
        setSchoolSessions(schoolSessionsRes.value.data.sessions || []);
      }

      // Set basic analytics
      setAnalytics({
        total_sessions: sessions.length,
        completed_sessions: sessions.filter(s => s.status === 'completed').length,
        total_students: students.length,
        total_teachers: teachers.length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/teachers/add`, teacherForm, { headers });
      
      setTeachers(prev => [...prev, response.data]);
      setShowAddTeacherModal(false);
      setTeacherForm({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        date_of_birth: '',
        gender: 'male',
        password: '',
        can_teach_male: true,
        can_teach_female: true
      });
      
      alert('Teacher added successfully!');
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert(error.response?.data?.detail || 'Failed to add teacher');
    }
  };

  const handleRemoveTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/teachers/${teacherId}`, { headers });
      
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
      alert('Teacher removed successfully!');
    } catch (error) {
      console.error('Error removing teacher:', error);
      alert(error.response?.data?.detail || 'Failed to remove teacher');
    }
  };

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(`${API}/driving-schools/${schoolInfo.id}`, schoolForm, { headers });
      
      setSchoolInfo(response.data);
      setShowEditSchoolModal(false);
      alert('School information updated successfully!');
    } catch (error) {
      console.error('Error updating school:', error);
      alert(error.response?.data?.detail || 'Failed to update school information');
    }
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/sessions/schedule`, sessionForm, { headers });
      
      setSchoolSessions(prev => [...prev, response.data]);
      setShowSessionModal(false);
      setSessionForm({
        student_id: '',
        teacher_id: '',
        session_type: 'theory',
        scheduled_at: '',
        duration_minutes: 60,
        location: ''
      });
      
      alert('Session scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert(error.response?.data?.detail || 'Failed to schedule session');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'scheduled': return 'bg-primary';
      case 'in_progress': return 'bg-warning';
      case 'cancelled': return 'bg-danger';
      case 'approved': return 'bg-success';
      case 'pending_approval': return 'bg-warning';
      case 'rejected': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getSessionTypeColor = (type) => {
    switch (type) {
      case 'theory': return 'bg-info';
      case 'park': return 'bg-warning';
      case 'road': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <div className="container-fluid px-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center py-4">
          <div>
            <h1 className="h3 mb-0">Teacher Dashboard</h1>
            <p className="text-muted mb-0">
              Welcome, {user.first_name} {user.last_name}
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={() => setShowSessionModal(true)}
              className="btn btn-primary"
            >
              <i className="fas fa-calendar-plus me-2"></i>
              Schedule Session
            </button>
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="btn btn-success"
            >
              <i className="fas fa-user-plus me-2"></i>
              Add Teacher
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ul className="nav nav-pills mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-chart-line me-2"></i>Overview
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'teachers' ? 'active' : ''}`}
              onClick={() => setActiveTab('teachers')}
            >
              <i className="fas fa-chalkboard-teacher me-2"></i>Manage Teachers ({teachers.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <i className="fas fa-users me-2"></i>Manage Students ({students.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'school-info' ? 'active' : ''}`}
              onClick={() => setActiveTab('school-info')}
            >
              <i className="fas fa-school me-2"></i>School Info
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className="fas fa-chart-bar me-2"></i>Analytics
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'schedules' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedules')}
            >
              <i className="fas fa-calendar me-2"></i>Schedules ({schoolSessions.length})
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="row g-4">
            {/* Key Metrics */}
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{teachers.length}</div>
                      <div className="small">Total Teachers</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-chalkboard-teacher"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{students.length}</div>
                      <div className="small">Total Students</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-users"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{schoolSessions.length}</div>
                      <div className="small">Total Sessions</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-calendar"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card bg-warning text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{schoolInfo?.rating || 0}/5</div>
                      <div className="small">School Rating</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-star"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Recent Sessions</h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Teacher</th>
                          <th>Type</th>
                          <th>Date & Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolSessions.slice(0, 5).map((session) => (
                          <tr key={session.id}>
                            <td>{session.student_name || 'Student'}</td>
                            <td>{session.teacher_name || 'Teacher'}</td>
                            <td>
                              <span className={`badge ${getSessionTypeColor(session.session_type)}`}>
                                {session.session_type?.toUpperCase()}
                              </span>
                            </td>
                            <td>{new Date(session.scheduled_at).toLocaleString()}</td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(session.status)}`}>
                                {session.status?.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Manage Teachers</h5>
              <button
                onClick={() => setShowAddTeacherModal(true)}
                className="btn btn-primary"
              >
                <i className="fas fa-user-plus me-2"></i>Add New Teacher
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Gender Restrictions</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar bg-primary text-white rounded-circle me-3" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {teacher.user_details?.first_name?.charAt(0) || 'T'}
                            </div>
                            <div>
                              <div className="fw-bold">{teacher.user_details?.first_name} {teacher.user_details?.last_name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{teacher.user_details?.email}</td>
                        <td>{teacher.user_details?.phone}</td>
                        <td>
                          <div className="d-flex gap-1">
                            {teacher.can_teach_male && <span className="badge bg-info">Male</span>}
                            {teacher.can_teach_female && <span className="badge bg-pink">Female</span>}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="text-warning me-1">★</span>
                            {teacher.rating || 0}/5
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${teacher.is_approved ? 'bg-success' : 'bg-warning'}`}>
                            {teacher.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-outline-secondary">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-outline-danger"
                              onClick={() => handleRemoveTeacher(teacher.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Manage Students</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Enrollment Status</th>
                      <th>Documents</th>
                      <th>Assigned Teacher</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar bg-info text-white rounded-circle me-3" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {student.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="fw-bold">{student.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{student.email}</td>
                        <td>{student.phone}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(student.enrollment_status)}`}>
                            {student.enrollment_status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${student.documents_verified ? 'bg-success' : 'bg-warning'}`}>
                            {student.documents_verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <select className="form-select form-select-sm">
                            <option value="">Assign Teacher</option>
                            {teachers.filter(t => t.is_approved).map(teacher => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.user_details?.first_name} {teacher.user_details?.last_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-outline-success">
                              <i className="fas fa-calendar"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'school-info' && schoolInfo && (
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">School Information</h5>
                  <button
                    onClick={() => setShowEditSchoolModal(true)}
                    className="btn btn-primary"
                  >
                    <i className="fas fa-edit me-2"></i>Edit School Info
                  </button>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-bold">School Name</label>
                        <p className="form-control-plaintext">{schoolInfo.name}</p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Address</label>
                        <p className="form-control-plaintext">{schoolInfo.address}</p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">State</label>
                        <p className="form-control-plaintext">{schoolInfo.state}</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-bold">Phone</label>
                        <p className="form-control-plaintext">{schoolInfo.phone}</p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Email</label>
                        <p className="form-control-plaintext">{schoolInfo.email}</p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Price</label>
                        <p className="form-control-plaintext">{schoolInfo.price} DA</p>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label fw-bold">Description</label>
                        <p className="form-control-plaintext">{schoolInfo.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">School Statistics</h6>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span>Rating</span>
                    <div className="d-flex align-items-center">
                      <span className="text-warning me-1">★</span>
                      {schoolInfo.rating || 0}/5
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Reviews</span>
                    <span className="fw-bold">{schoolInfo.total_reviews || 0}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span>Teachers</span>
                    <span className="fw-bold">{teachers.length}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Students</span>
                    <span className="fw-bold">{students.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Performance Overview</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="metric text-center">
                        <div className="metric-value h3 mb-0 text-primary">{teachers.length}</div>
                        <div className="metric-label text-muted">Teachers</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric text-center">
                        <div className="metric-value h3 mb-0 text-success">{students.length}</div>
                        <div className="metric-label text-muted">Students</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric text-center">
                        <div className="metric-value h3 mb-0 text-info">{schoolSessions.length}</div>
                        <div className="metric-label text-muted">Sessions</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric text-center">
                        <div className="metric-value h3 mb-0 text-warning">{schoolInfo?.rating || 0}/5</div>
                        <div className="metric-label text-muted">Rating</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Session Distribution</h6>
                </div>
                <div className="card-body">
                  <div className="session-types">
                    {['theory', 'park', 'road'].map((type) => {
                      const typeSessions = schoolSessions.filter(s => s.session_type === type);
                      const total = schoolSessions.length;
                      const percentage = total > 0 ? (typeSessions.length / total) * 100 : 0;
                      
                      return (
                        <div key={type} className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <div className="fw-bold text-capitalize">{type}</div>
                            <div className="small text-muted">{typeSessions.length} sessions</div>
                          </div>
                          <div className="text-end">
                            <div className="h6 mb-0">{Math.round(percentage)}%</div>
                            <div className="progress" style={{ width: '60px', height: '4px' }}>
                              <div
                                className={`progress-bar ${getSessionTypeColor(type).replace('bg-', 'bg-')}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Enrollment Status Distribution</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-3">
                      <div className="stat-card text-center p-3 bg-success bg-opacity-10 rounded">
                        <div className="stat-number h4 mb-0 text-success">
                          {students.filter(s => s.enrollment_status === 'approved').length}
                        </div>
                        <div className="stat-label text-muted">Approved</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="stat-card text-center p-3 bg-warning bg-opacity-10 rounded">
                        <div className="stat-number h4 mb-0 text-warning">
                          {students.filter(s => s.enrollment_status === 'pending_approval').length}
                        </div>
                        <div className="stat-label text-muted">Pending</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="stat-card text-center p-3 bg-info bg-opacity-10 rounded">
                        <div className="stat-number h4 mb-0 text-info">
                          {students.filter(s => s.documents_verified).length}
                        </div>
                        <div className="stat-label text-muted">Verified Docs</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="stat-card text-center p-3 bg-primary bg-opacity-10 rounded">
                        <div className="stat-number h4 mb-0 text-primary">
                          {teachers.filter(t => t.is_approved).length}
                        </div>
                        <div className="stat-label text-muted">Active Teachers</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Schedule Management</h5>
              <button
                onClick={() => setShowSessionModal(true)}
                className="btn btn-primary"
              >
                <i className="fas fa-calendar-plus me-2"></i>Schedule New Session
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Teacher</th>
                      <th>Session Type</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolSessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.student_name || 'Student'}</td>
                        <td>{session.teacher_name || 'Teacher'}</td>
                        <td>
                          <span className={`badge ${getSessionTypeColor(session.session_type)}`}>
                            {session.session_type?.toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(session.scheduled_at).toLocaleString()}</td>
                        <td>{session.duration_minutes} min</td>
                        <td>{session.location || 'N/A'}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(session.status)}`}>
                            {session.status?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-outline-secondary">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-outline-danger">
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Teacher</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddTeacherModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddTeacher}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={teacherForm.email}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        value={teacherForm.password}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.first_name}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, first_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.last_name}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, last_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.phone}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-select"
                        value={teacherForm.gender}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, gender: e.target.value }))}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control"
                        value={teacherForm.date_of_birth}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.address}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Teaching Permissions</label>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={teacherForm.can_teach_male}
                              onChange={(e) => setTeacherForm(prev => ({ ...prev, can_teach_male: e.target.checked }))}
                            />
                            <label className="form-check-label">
                              Can teach male students
                            </label>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={teacherForm.can_teach_female}
                              onChange={(e) => setTeacherForm(prev => ({ ...prev, can_teach_female: e.target.checked }))}
                            />
                            <label className="form-check-label">
                              Can teach female students
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddTeacherModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Teacher
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {showEditSchoolModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit School Information</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditSchoolModal(false)}
                ></button>
              </div>
              <form onSubmit={handleUpdateSchool}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">School Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={schoolForm.name}
                        onChange={(e) => setSchoolForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">State *</label>
                      <select
                        className="form-select"
                        value={schoolForm.state}
                        onChange={(e) => setSchoolForm(prev => ({ ...prev, state: e.target.value }))}
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={schoolForm.address}
                        onChange={(e) => setSchoolForm(prev => ({ ...prev, address: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={schoolForm.phone}
                        onChange={(e) => setSchoolForm(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={schoolForm.email}
                        onChange={(e) => setSchoolForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Price (DA) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={schoolForm.price}
                        onChange={(e) => setSchoolForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={schoolForm.description}
                        onChange={(e) => setSchoolForm(prev => ({ ...prev, description: e.target.value }))}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditSchoolModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update School Info
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {showSessionModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Schedule New Session</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSessionModal(false)}
                ></button>
              </div>
              <form onSubmit={handleScheduleSession}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Student *</label>
                      <select
                        className="form-select"
                        value={sessionForm.student_id}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, student_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Student</option>
                        {students.filter(s => s.enrollment_status === 'approved').map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Teacher *</label>
                      <select
                        className="form-select"
                        value={sessionForm.teacher_id}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, teacher_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Teacher</option>
                        {teachers.filter(t => t.is_approved).map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.user_details?.first_name} {teacher.user_details?.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Session Type *</label>
                      <select
                        className="form-select"
                        value={sessionForm.session_type}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, session_type: e.target.value }))}
                        required
                      >
                        <option value="theory">Theory</option>
                        <option value="park">Park Practice</option>
                        <option value="road">Road Practice</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Duration (minutes) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={sessionForm.duration_minutes}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                        min="30"
                        max="180"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={sessionForm.scheduled_at}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={sessionForm.location}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter session location"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSessionModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Schedule Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;