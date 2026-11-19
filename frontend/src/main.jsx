import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  GraduationCap, BriefcaseBusiness, LayoutDashboard, Search, FileText, Users,
  Plus, LogOut, MapPin, IndianRupee, Building2, Upload, CheckCircle2,
  Clock3, Eye, Download, X, Menu, ShieldCheck, ArrowRight, ClipboardList,
  AlertCircle, RefreshCw
} from "lucide-react";
import "./style.css";

const API = "/api";
const money = (v) => v || "Not specified";

function App() {
  const [token, setToken] = useState(localStorage.getItem("cc_token") || "");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc_user") || "null"); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState("login");
  const [role, setRole] = useState("student");
  const [page, setPage] = useState("overview");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [query, setQuery] = useState("");
  const [applyJob, setApplyJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  const request = async (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(options.body instanceof FormData) && options.body) headers["Content-Type"] = "application/json";
    let response;
    try { response = await fetch(`${API}${url}`, { ...options, headers }); }
    catch (error) { throw new Error("Cannot reach CampusConnect API. Make sure both servers are running and open the site at http://localhost:5173."); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Something went wrong.");
    return data;
  };

  const flash = (text, type = "success") => {
    setNotice({ text, type });
    window.setTimeout(() => setNotice({ text: "", type: "" }), 4500);
  };

  const saveSession = (data) => {
    localStorage.setItem("cc_token", data.token);
    localStorage.setItem("cc_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setPage("overview");
    setNotice({ type: "", text: "" });
  };

  const logout = () => {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    setToken(""); setUser(null); setJobs([]); setApplications([]);
    setApplyJob(null); setPage("overview");
  };

  const loadDashboard = async () => {
    if (!token || !user) return;
    try {
      if (user.role === "student") {
        const [j, a] = await Promise.all([request("/jobs"), request("/applications/mine")]);
        setJobs(j.jobs); setApplications(a.applications);
      } else {
        const [j, a] = await Promise.all([request("/recruiter/jobs"), request("/recruiter/applications")]);
        setJobs(j.jobs); setApplications(a.applications);
      }
    } catch (e) {
      if (/session|log in/i.test(e.message)) logout();
      else flash(e.message, "error");
    }
  };

  useEffect(() => { loadDashboard(); }, [token, user?.id]);

  const filteredJobs = useMemo(() => jobs.filter(j =>
    `${j.title} ${j.company_name} ${j.location}`.toLowerCase().includes(query.toLowerCase())
  ), [jobs, query]);

  const submitAuth = async (form) => {
    setBusy(true);
    try {
      const data = await request(`/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST", body: JSON.stringify(form)
      });
      saveSession(data);
    } catch (e) { flash(e.message, "error"); }
    finally { setBusy(false); }
  };

  const submitJob = async (form) => {
    setBusy(true);
    try {
      if (editingJob) {
        await request(`/recruiter/jobs/${editingJob.id}`, { method: "PUT", body: JSON.stringify(form) });
        flash("Job updated successfully.");
        setEditingJob(null);
      } else {
        await request("/jobs", { method: "POST", body: JSON.stringify(form) });
        flash("Job published successfully.");
      }
      await loadDashboard();
      setPage("jobs");
    } catch (e) { flash(e.message, "error"); }
    finally { setBusy(false); }
  };

  const submitApplication = async (jobId, file) => {
    if (!file) return flash("Please choose a PDF resume first.", "error");
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return flash("Only PDF resumes are accepted.", "error");
    if (file.size > 5 * 1024 * 1024) return flash("Resume must be 5 MB or smaller.", "error");
    const form = new FormData(); form.append("resume", file);
    setBusy(true);
    try {
      await request(`/jobs/${jobId}/apply`, { method: "POST", body: form });
      flash("Application submitted successfully. Your resume is attached.");
      setApplyJob(null);
      await loadDashboard();
    } catch (e) { flash(e.message, "error"); }
    finally { setBusy(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await request(`/recruiter/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      flash(`Applicant marked as ${status.toLowerCase()}.`);
      await loadDashboard();
    } catch (e) { flash(e.message, "error"); }
  };

  const cancelApplication = async (id) => {
    if (!window.confirm("Cancel this job application? This will withdraw your application.")) return;
    try { await request(`/applications/${id}`, { method: "DELETE" }); flash("Application cancelled."); await loadDashboard(); }
    catch (e) { flash(e.message, "error"); }
  };

  const removeJob = async (id) => {
    if (!window.confirm("Remove this job? Its applications will also be deleted.")) return;
    try { await request(`/recruiter/jobs/${id}`, { method: "DELETE" }); flash("Job removed."); await loadDashboard(); }
    catch (e) { flash(e.message, "error"); }
  };

  const viewResume = async (id, download = false) => {
    try {
      const response = await fetch(`${API}/recruiter/applications/${id}/resume`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Could not open resume.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement("a"); a.href = url; a.download = "candidate-resume.pdf"; a.click();
      } else window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { flash(e.message, "error"); }
  };

  if (!token || !user) return <AuthScreen mode={authMode} setMode={setAuthMode} role={role} setRole={setRole} onSubmit={submitAuth} busy={busy} notice={notice} />;

  const nav = user.role === "student"
    ? [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "jobs", label: "Find jobs", icon: BriefcaseBusiness }, { id: "applications", label: "My applications", icon: ClipboardList }]
    : [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "jobs", label: "My job posts", icon: BriefcaseBusiness }, { id: "post", label: "Post a job", icon: Plus }, { id: "applicants", label: "Applicants", icon: Users }];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand"><span className="brand-mark"><GraduationCap size={23}/></span><span>Campus<span>Connect</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{nav.map(item => <button key={item.id} className={`nav-link ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileNav(false); }}><item.icon size={18}/>{item.label}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="secure-note"><ShieldCheck size={17}/><span>Secure role-based access</span></div>
          <button className="nav-link logout" onClick={logout}><LogOut size={18}/>Sign out</button>
        </div>
      </aside>
      {mobileNav && <div className="mobile-scrim" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)}><Menu size={20}/></button>
          <div className="breadcrumb">CampusConnect <span>/</span> {nav.find(n => n.id === page)?.label || "Dashboard"}</div>
          <div className="profile-chip"><div className="avatar">{user.name?.[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>{user.role === "student" ? `Student · ${user.registrationNumber}` : user.companyName}</small></div></div>
        </header>
        <div className="content">
          {notice.text && <div className={`notice ${notice.type}`}><span>{notice.text}</span><button onClick={() => setNotice({text:"",type:""})}><X size={16}/></button></div>}
          {page === "overview" && <Overview user={user} jobs={jobs} applications={applications} setPage={setPage} setSelectedJob={setSelectedJob}/>}
          {page === "jobs" && (user.role === "student"
            ? <JobsPage jobs={filteredJobs} query={query} setQuery={setQuery} onApply={setApplyJob} onDetails={setSelectedJob}/>
            : <RecruiterJobs jobs={jobs} setPage={setPage} onRemove={removeJob} onEdit={job => { setEditingJob(job); setPage("post"); }}/>)}
          {page === "post" && user.role === "recruiter" && <PostJob onSubmit={submitJob} busy={busy} initialJob={editingJob} onCancelEdit={() => { setEditingJob(null); setPage("jobs"); }}/>}
          {page === "applications" && user.role === "student" && <StudentApplications applications={applications} onCancel={cancelApplication}/>}
          {page === "applicants" && user.role === "recruiter" && <Applicants applications={applications} updateStatus={updateStatus} viewResume={viewResume}/>}
        </div>
      </main>
      {selectedJob && <JobDetailsModal job={selectedJob} onClose={()=>setSelectedJob(null)} onApply={(job)=>{setSelectedJob(null);setApplyJob(job);}} hasApplied={selectedJob.has_applied}/>}
      {applyJob && <ApplyModal job={applyJob} busy={busy} onClose={() => setApplyJob(null)} onSubmit={submitApplication}/>}
    </div>
  );
}

function AuthScreen({ mode, setMode, role, setRole, onSubmit, busy, notice }) {
  const [form, setForm] = useState({ name:"", email:"", password:"", registrationNumber:"", companyName:"" });
  const [showPassword, setShowPassword] = useState(false);
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const submit = e => { e.preventDefault(); onSubmit({ ...form, role }); };
  return <div className="auth-page">
    <div className="auth-left">
      <div className="brand light"><span className="brand-mark"><GraduationCap size={23}/></span><span>Campus<span>Connect</span></span></div>
      <div className="hero-copy"><div className="eyebrow"><span/> CAMPUS PLACEMENT PLATFORM</div><h1>Your next chapter<br/><em>starts here.</em></h1><p>One place for students to discover opportunities and recruiters to find their next great hire.</p>
        <div className="hero-points"><div><CheckCircle2/> Verified student profiles</div><div><CheckCircle2/> Direct recruiter connections</div><div><CheckCircle2/> Resume-based applications</div></div>
      </div>
      <div className="auth-footer">© 2026 CampusConnect · Built for campus careers</div>
    </div>
    <div className="auth-right">
      <div className="auth-card">
        <div className="auth-heading"><span className="mini-label">{mode === "register" ? "GET STARTED" : "WELCOME BACK"}</span><h2>{mode === "register" ? "Create your account" : "Sign in to CampusConnect"}</h2><p>{mode === "register" ? "First, tell us how you'll use CampusConnect." : "Enter your details to continue to your workspace."}</p></div>
        {notice.text && <div className={`notice ${notice.type}`}>{notice.text}</div>}
        <div className="role-picker"><button className={role === "student" ? "selected" : ""} onClick={() => setRole("student")}><GraduationCap size={19}/><span><b>I'm a student</b><small>Find and apply for jobs</small></span></button><button className={role === "recruiter" ? "selected" : ""} onClick={() => setRole("recruiter")}><BriefcaseBusiness size={19}/><span><b>I'm hiring</b><small>Post jobs and review talent</small></span></button></div>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <Field label="Full name" value={form.name} onChange={v=>change("name",v)} placeholder="Your full name" required/>}
          <Field label="Email address" type="email" value={form.email} onChange={v=>change("email",v)} placeholder="you@example.com" required/>
          {mode === "register" && role === "student" && <Field label="College registration number" value={form.registrationNumber} onChange={v=>change("registrationNumber",v)} placeholder="e.g. 23CSE1042" required/>}
          {mode === "register" && role === "recruiter" && <Field label="Company name" value={form.companyName} onChange={v=>change("companyName",v)} placeholder="Your company" required/>}
          <div className="field"><label>Password</label><div className="password-wrap"><input type={showPassword?"text":"password"} value={form.password} onChange={e=>change("password",e.target.value)} placeholder={mode==="register"?"At least 8 characters":"Enter your password"} minLength={mode==="register"?8:1} required/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?"Hide":"Show"}</button></div></div>
          <button className="primary-btn full" disabled={busy}>{busy ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"} <ArrowRight size={17}/></button>
        </form>
        <div className="auth-switch">{mode === "register" ? "Already have an account?" : "New to CampusConnect?"} <button onClick={() => setMode(mode === "register" ? "login" : "register")}>{mode === "register" ? "Sign in" : "Create account"}</button></div>
        <div className="auth-security"><ShieldCheck size={15}/> Your account is protected with encrypted password storage.</div>
      </div>
    </div>
  </div>;
}

function Field({label,value,onChange,placeholder,type="text",required}) {
  return <div className="field"><label>{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required}/></div>;
}

function Overview({ user, jobs, applications, setPage, setSelectedJob }) {
  const student = user.role === "student";
  const stats = student
    ? [{label:"Available opportunities",value:jobs.length,icon:BriefcaseBusiness},{label:"Applications submitted",value:applications.length,icon:ClipboardList},{label:"Shortlisted",value:applications.filter(a=>a.status==="Shortlisted").length,icon:CheckCircle2}]
    : [{label:"Active job posts",value:jobs.length,icon:BriefcaseBusiness},{label:"Total applicants",value:applications.length,icon:Users},{label:"Shortlisted",value:applications.filter(a=>a.status==="Shortlisted").length,icon:CheckCircle2}];
  return <><div className="page-heading"><div><span className="mini-label">YOUR WORKSPACE</span><h1>{student ? `Welcome, ${user.name.split(" ")[0]}` : `Welcome, ${user.companyName}`}</h1><p>{student ? "Discover roles that match your goals and track every application." : "Manage your campus hiring pipeline from one dashboard."}</p></div><div className="today-pill"><span/> Account active</div></div>
    <div className="stats-grid">{stats.map(s=><div className="stat-card" key={s.label}><div className="stat-icon"><s.icon size={20}/></div><div><strong>{s.value}</strong><span>{s.label}</span></div></div>)}</div>
    <div className="section-heading"><div><h2>{student ? "Recommended opportunities" : "Recent applicants"}</h2><p>{student ? "Explore the latest campus openings." : "Candidates who have applied to your jobs."}</p></div><button className="text-btn" onClick={()=>setPage(student?"jobs":"applicants")}>{student?"Browse jobs":"View applicants"} <ArrowRight size={16}/></button></div>
    {student ? <div className="job-grid">{jobs.slice(0,3).map(j=><JobCard key={j.id} job={j} compact onDetails={setSelectedJob}/>)}</div> : <ApplicantsPreview applications={applications.slice(0,4)}/>}
  </>;
}

function JobCard({job,onApply,onDetails,compact=false}) {
  return <article className="job-card"><div className="job-card-top"><div className="company-avatar"><Building2 size={21}/></div><span className="job-tag">OPEN</span></div><h3>{job.title}</h3><div className="company-name">{job.company_name}</div><p className="job-description">{job.description}</p><div className="job-meta"><span><MapPin size={15}/>{job.location}</span><span><IndianRupee size={15}/>{job.package}</span></div>{job.eligibility && <div className="eligibility">{job.eligibility}</div>}<div className="eligibility">Apply by: {job.deadline ? new Date(job.deadline+"T00:00:00").toLocaleDateString() : "Not specified"}</div>{<div className="job-card-footer">{onDetails && <button className="outline-btn" onClick={()=>onDetails(job)}>View details</button>} {!compact && (job.has_applied ? <span className="applied-label"><CheckCircle2 size={16}/> Applied</span> : <button className="primary-btn small" onClick={()=>onApply(job)}>Apply now <ArrowRight size={15}/></button>)}</div>}</article>;
}

function JobsPage({jobs,query,setQuery,onApply,onDetails}) {
  return <><div className="page-heading"><div><span className="mini-label">CAREER OPPORTUNITIES</span><h1>Find your next role</h1><p>Browse campus openings and apply with your resume.</p></div></div><div className="search-bar"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by role, company or location..."/></div><div className="job-grid">{jobs.map(j=><JobCard key={j.id} job={j} onApply={onApply} onDetails={onDetails}/>)}</div>{jobs.length===0&&<Empty icon={Search} title="No jobs found" text="Try another search term."/>}</>;
}

function JobDetailsModal({job,onClose,onApply,hasApplied}) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal"><div className="modal-head"><div><span className="mini-label">JOB DETAILS</span><h2>{job.title}</h2><p>{job.company_name} · {job.location}</p></div><button className="icon-button" onClick={onClose}><X/></button></div>
    <div className="detail-meta"><span><MapPin size={15}/>{job.location}</span><span><IndianRupee size={15}/>{job.package}</span><span><Clock3 size={15}/>Apply by {job.deadline ? new Date(job.deadline+"T00:00:00").toLocaleDateString() : "Not specified"}</span></div>
    <h3 className="detail-section-title">About this role</h3><p className="detail-description">{job.description}</p>
    {job.eligibility && <><h3 className="detail-section-title">Eligibility</h3><p className="detail-description">{job.eligibility}</p></>}
    <div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Close</button>{hasApplied?<span className="applied-label"><CheckCircle2 size={16}/> Already applied</span>:<button className="primary-btn" onClick={()=>onApply(job)}>Apply with resume <ArrowRight size={16}/></button>}</div>
    </div></div>;
}

function ApplyModal({job,busy,onClose,onSubmit}) {
  const [file,setFile] = useState(null);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><div className="modal-head"><div><span className="mini-label">JOB APPLICATION</span><h2>Apply for {job.title}</h2><p>{job.company_name} · {job.location}</p></div><button className="icon-button" onClick={onClose}><X/></button></div><div className="upload-panel"><div className="upload-icon"><Upload size={24}/></div><h3>Attach your resume</h3><p>Upload your latest resume as a PDF. Recruiters for this job will be able to view it.</p><label className="file-picker"><input type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><FileText size={17}/>{file ? file.name : "Choose PDF resume"}</label><small>PDF only · Maximum file size 5 MB</small></div><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!file||busy} onClick={()=>onSubmit(job.id,file)}>{busy?"Submitting...":"Submit application"} <ArrowRight size={16}/></button></div></div></div>;
}

function StudentApplications({applications,onCancel}) {
  return <><div className="page-heading"><div><span className="mini-label">APPLICATION TRACKER</span><h1>My applications</h1><p>Keep track of your submitted applications and recruiter updates.</p></div></div>{applications.length ? <div className="table-wrap"><table><thead><tr><th>JOB ROLE</th><th>COMPANY</th><th>RESUME</th><th>STATUS</th><th>APPLIED ON</th><th>ACTION</th></tr></thead><tbody>{applications.map(a=><tr key={a.id}><td><b>{a.title}</b><small>{a.location}</small></td><td>{a.company_name}</td><td><span className="resume-name"><FileText size={15}/>{a.resume_original_name}</span></td><td><Status value={a.status}/></td><td>{new Date(a.created_at+"Z").toLocaleDateString()}</td><td><button className="outline-btn danger-btn" onClick={()=>onCancel(a.id)}>Cancel application</button></td></tr>)}</tbody></table></div>:<Empty icon={ClipboardList} title="No applications yet" text="Browse available jobs and apply with your resume."/>}</>;
}

function RecruiterJobs({jobs,setPage,onRemove,onEdit}) {
  return <><div className="page-heading"><div><span className="mini-label">HIRING WORKSPACE</span><h1>Your job posts</h1><p>Manage the opportunities published by your company.</p></div><button className="primary-btn" onClick={()=>setPage("post")}><Plus size={17}/> Post a job</button></div>{jobs.length?<div className="job-grid">{jobs.map(j=><div className="job-card" key={j.id}><div className="job-card-top"><div className="company-avatar"><Building2 size={21}/></div><span className="job-tag">{j.status === "closed" ? "CLOSED" : "OPEN"}</span></div><h3>{j.title}</h3><div className="company-name">{j.company_name}</div><div className="job-meta"><span><MapPin size={15}/>{j.location}</span><span><Users size={15}/>{j.applicant_count} applicants</span></div><div className="eligibility">{j.package}</div><div className="eligibility">Deadline: {j.deadline ? new Date(j.deadline+"T00:00:00").toLocaleDateString() : "Not set"}</div><div className="job-card-footer"><button className="outline-btn" onClick={()=>onEdit(j)}>Edit job</button><button className="outline-btn danger-btn" onClick={()=>onRemove(j.id)}>Remove job</button></div></div>)}</div>:<Empty icon={BriefcaseBusiness} title="No job posts yet" text="Create your first campus opportunity."/>}</>;
}

function PostJob({onSubmit,busy,initialJob,onCancelEdit}) {
  const [form,setForm]=useState(() => initialJob ? {title:initialJob.title,description:initialJob.description,location:initialJob.location,package:initialJob.package,eligibility:initialJob.eligibility || "",deadline:initialJob.deadline || ""} : {title:"",description:"",location:"",package:"",eligibility:"",deadline:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return <><div className="page-heading"><div><span className="mini-label">RECRUITER TOOLS</span><h1>{initialJob ? "Edit job opportunity" : "Post a new opportunity"}</h1><p>{initialJob ? "Update the details and application deadline." : "Share a role with eligible students on CampusConnect."}</p></div></div><form className="form-panel" onSubmit={e=>{e.preventDefault();onSubmit(form);}}><div className="form-grid"><Field label="Job title" value={form.title} onChange={v=>set("title",v)} placeholder="e.g. Graduate Trainee" required/><Field label="Location" value={form.location} onChange={v=>set("location",v)} placeholder="e.g. Bengaluru" required/><Field label="Package" value={form.package} onChange={v=>set("package",v)} placeholder="e.g. ₹5 LPA" required/><Field label="Eligibility" value={form.eligibility} onChange={v=>set("eligibility",v)} placeholder="e.g. 6.5 CGPA and above"/><div className="field"><label>Application deadline</label><input type="date" min={new Date().toISOString().slice(0,10)} value={form.deadline} onChange={e=>set("deadline",e.target.value)} required/></div><div className="field full-span"><label>Job description</label><textarea rows="5" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Describe the role, responsibilities and required skills..." required/></div></div><div className="form-actions"><button className="primary-btn" disabled={busy}>{busy?"Publishing...":"Publish job"} <ArrowRight size={16}/></button></div></form></>;
}

function Applicants({applications,updateStatus,viewResume}) {
  return <><div className="page-heading"><div><span className="mini-label">TALENT PIPELINE</span><h1>Applicants</h1><p>Review candidate profiles and securely access submitted resumes.</p></div><div className="today-pill">{applications.length} applications</div></div>{applications.length ? <div className="applicant-list">{applications.map(a=><div className="applicant-card" key={a.id}><div className="candidate-avatar">{a.student_name?.[0]?.toUpperCase()}</div><div className="candidate-info"><h3>{a.student_name}</h3><p>{a.student_email}</p><small>Registration no. {a.registration_number} · Applied for <b>{a.job_title}</b></small><div className="resume-actions"><button className="outline-btn" onClick={()=>viewResume(a.id)}><Eye size={15}/> View resume</button><button className="outline-btn" onClick={()=>viewResume(a.id,true)}><Download size={15}/> Download</button></div></div><div className="candidate-status"><Status value={a.status}/><select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)}><option>Submitted</option><option>Under Review</option><option>Shortlisted</option><option>Rejected</option></select></div></div>)}</div>:<Empty icon={Users} title="No applicants yet" text="When students apply to your jobs, their applications will appear here."/>}</>;
}

function ApplicantsPreview({applications}) {
  return applications.length ? <div className="applicant-list">{applications.map(a=><div className="applicant-card" key={a.id}><div className="candidate-avatar">{a.student_name?.[0]?.toUpperCase()}</div><div className="candidate-info"><h3>{a.student_name}</h3><p>{a.student_email}</p><small>{a.job_title}</small></div><Status value={a.status}/></div>)}</div>:<Empty icon={Users} title="No applicants yet" text="Your applicants will appear here after students apply."/>;
}

function Status({value}) {
  const cls = value==="Shortlisted"?"green":value==="Rejected"?"red":value==="Submitted"?"blue":"amber";
  return <span className={`status ${cls}`}><i/>{value}</span>;
}
function Empty({icon:Icon,title,text}) { return <div className="empty-state"><div><Icon size={24}/></div><h3>{title}</h3><p>{text}</p></div>; }

createRoot(document.getElementById("root")).render(<App/>);