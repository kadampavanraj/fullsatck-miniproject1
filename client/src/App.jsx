import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, Users, Plus, Search, CheckCircle2, XCircle, Monitor, FlaskConical, Presentation, DoorOpen, LayoutDashboard, CalendarCheck, Boxes, GraduationCap, Trash2, RefreshCw } from "lucide-react";

const API = "/api";
const types = ["All", "Lab", "Hall", "Equipment", "Room"];
const iconFor = (type) => type === "Lab" ? FlaskConical : type === "Hall" ? Presentation : type === "Equipment" ? Monitor : DoorOpen;
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function App() {
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [role, setRole] = useState("Student");
  const [tab, setTab] = useState("Explore");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [bookingForm, setBookingForm] = useState({ studentName: "", studentEmail: "", purpose: "", date: tomorrow, startTime: "10:00", endTime: "11:00" });
  const [resourceForm, setResourceForm] = useState({ name: "", type: "Lab", location: "", capacity: 20, description: "" });

  const headers = role === "Admin" ? { "x-demo-role": "admin", "Content-Type": "application/json" } : { "Content-Type": "application/json" };

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Something went wrong");
    return data;
  }
  async function load() {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([request("/resources"), request("/bookings")]);
      setResources(r); setBookings(b);
      setNotice({ type: "", text: "" });
    } catch { setNotice({ type: "error", text: "Can't connect to the API. Start MongoDB and the backend, then refresh." }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const visibleResources = useMemo(() => resources.filter(r => (filter === "All" || r.type === filter) && `${r.name} ${r.location} ${r.description}`.toLowerCase().includes(search.toLowerCase())), [resources, filter, search]);
  const pending = bookings.filter(b => b.status === "Pending").length;
  const approved = bookings.filter(b => b.status === "Approved").length;

  async function createBooking(e) {
    e.preventDefault();
    try {
      await request("/bookings", { method: "POST", body: JSON.stringify({ ...bookingForm, resource: selected._id }) });
      setSelected(null); setBookingForm(f => ({ ...f, purpose: "" }));
      setNotice({ type: "success", text: "Booking request submitted! You can track its status in My Bookings." });
      await load();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }
  async function addResource(e) {
    e.preventDefault();
    try {
      await request("/resources", { method: "POST", body: JSON.stringify({ ...resourceForm, capacity: Number(resourceForm.capacity) }) });
      setResourceForm({ name: "", type: "Lab", location: "", capacity: 20, description: "" });
      setNotice({ type: "success", text: "Resource added successfully." }); await load();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }
  async function updateStatus(id, status) {
    try { await request(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); setNotice({ type: "success", text: `Booking ${status.toLowerCase()}.` }); await load(); }
    catch (err) { setNotice({ type: "error", text: err.message }); }
  }
  async function cancelBooking(booking) {
    try { await request(`/bookings/${booking._id}?email=${encodeURIComponent(booking.studentEmail)}`, { method: "DELETE" }); setNotice({ type: "success", text: "Booking cancelled." }); await load(); }
    catch (err) { setNotice({ type: "error", text: err.message }); }
  }

  return <div className="layout">
    <aside className="sidebar">
      <div className="logo"><div className="logo-icon"><Boxes size={22}/></div><div><b>Campus<span>Hub</span></b><small>RESOURCE BOOKING</small></div></div>
      <div className="campus-tag"><GraduationCap size={16}/><span>Campus services</span></div>
      <p className="nav-label">WORKSPACE</p>
      {[["Explore",LayoutDashboard],["My Bookings",CalendarCheck],...(role === "Admin" ? [["Manage Resources",Boxes],["Approvals",CheckCircle2]] : [])].map(([name, Icon]) => <button key={name} className={`nav-item ${tab === name ? "active" : ""}`} onClick={() => setTab(name)}><Icon size={17}/>{name}{name === "Approvals" && pending > 0 && <span className="nav-count">{pending}</span>}</button>)}
      <div className="sidebar-bottom"><div className="help-card"><div className="help-dot">?</div><b>Need help?</b><p>Contact your campus administrator for booking support.</p></div><div className="profile"><div className="avatar">{role === "Admin" ? "AD" : "ST"}</div><div className="profile-info"><b>{role === "Admin" ? "Campus Admin" : "Student User"}</b><small>{role === "Admin" ? "Administrator" : "Campus member"}</small></div></div></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb">Campus services <span>/</span> <b>{tab}</b></div><div className="top-actions"><span className="today"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span><label className="role-select">View as <select value={role} onChange={e => {setRole(e.target.value);setTab("Explore");setNotice({type:"",text:""});}}><option>Student</option><option>Admin</option></select></label><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={16}/></button></div></header>
      <div className="page">
        <section className="welcome"><div><div className="eyebrow">CAMPUS RESOURCE CENTER</div><h1>{tab === "Explore" ? "Book your next space." : tab === "My Bookings" ? "Your bookings." : tab === "Approvals" ? "Booking approvals." : "Manage resources."}</h1><p>{tab === "Explore" ? "Find the right space or equipment for your next great idea." : tab === "My Bookings" ? "Review reservation requests and their current status." : tab === "Approvals" ? "Review pending requests and keep campus resources organized." : "Add and maintain the resources available across campus."}</p></div><div className="welcome-art"><div className="art-circle"><CalendarCheck size={32}/></div><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span></div></section>

        {notice.text && <div className={`notice ${notice.type}`}><span>{notice.type === "error" ? "!" : "✓"}</span>{notice.text}<button onClick={() => setNotice({type:"",text:""})}>×</button></div>}

        <section className="metrics">
          <div className="metric"><div className="metric-icon blue"><Boxes size={18}/></div><div><span>Total resources</span><b>{resources.length}</b><small>Spaces & equipment</small></div></div>
          <div className="metric"><div className="metric-icon amber"><Clock3 size={18}/></div><div><span>Pending requests</span><b>{pending}</b><small>Awaiting review</small></div></div>
          <div className="metric"><div className="metric-icon green"><CheckCircle2 size={18}/></div><div><span>Approved bookings</span><b>{approved}</b><small>Confirmed reservations</small></div></div>
        </section>

        {tab === "Explore" && <section className="resource-section"><div className="section-head"><div><h2>Explore resources</h2><p>Choose a resource to see booking options.</p></div><span className="result-count">{visibleResources.length} resources</span></div><div className="filters"><div className="search-box"><Search size={17}/><input placeholder="Search rooms, labs, equipment..." value={search} onChange={e => setSearch(e.target.value)}/></div><div className="type-filters">{types.map(t => <button key={t} className={filter === t ? "selected" : ""} onClick={() => setFilter(t)}>{t}</button>)}</div></div>
          {loading ? <div className="loading">Loading resources...</div> : <div className="resource-grid">{visibleResources.map(resource => { const Icon = iconFor(resource.type); return <article className="resource-card" key={resource._id}><div className={`resource-visual visual-${resource.type.toLowerCase()}`}><div className="resource-visual-icon"><Icon size={25}/></div><span className="resource-type">{resource.type}</span><span className={`availability ${resource.status === "Available" ? "" : "maintenance"}`}><i/>{resource.status}</span></div><div className="resource-content"><h3>{resource.name}</h3><p className="resource-location"><MapPin size={14}/>{resource.location}</p><p className="resource-description">{resource.description || "Campus resource available for student use."}</p><div className="resource-foot"><span><Users size={15}/>{resource.capacity} {resource.type === "Equipment" ? "unit" : "people"}</span><button disabled={resource.status !== "Available"} onClick={() => setSelected(resource)}>Book resource <span>↗</span></button></div></div></article>})}</div>}
          {!loading && visibleResources.length === 0 && <div className="empty"><Search size={25}/><b>No matching resources</b><p>Try another search or category.</p></div>}
        </section>}

        {tab === "My Bookings" && <section className="panel table-panel"><div className="section-head"><div><h2>All booking requests</h2><p>Demo view showing campus booking records.</p></div><button className="outline-btn" onClick={load}><RefreshCw size={14}/> Refresh</button></div><BookingTable bookings={bookings} role={role} cancel={cancelBooking} updateStatus={updateStatus}/></section>}

        {tab === "Approvals" && <section className="panel table-panel"><div className="section-head"><div><h2>Review requests</h2><p>Approve or reject student resource bookings.</p></div><span className="pending-label">{pending} pending</span></div><BookingTable bookings={bookings.filter(b => b.status === "Pending")} role={role} cancel={cancelBooking} updateStatus={updateStatus}/></section>}

        {tab === "Manage Resources" && <section className="admin-grid"><div className="panel"><div className="section-head"><div><h2>Add a resource</h2><p>Make campus spaces and equipment bookable.</p></div></div><form className="resource-form" onSubmit={addResource}><label>Resource name<input required value={resourceForm.name} onChange={e => setResourceForm({...resourceForm,name:e.target.value})} placeholder="e.g. Multimedia Lab"/></label><div className="form-row"><label>Type<select value={resourceForm.type} onChange={e => setResourceForm({...resourceForm,type:e.target.value})}>{types.slice(1).map(t=><option key={t}>{t}</option>)}</select></label><label>Capacity / quantity<input type="number" min="1" required value={resourceForm.capacity} onChange={e => setResourceForm({...resourceForm,capacity:e.target.value})}/></label></div><label>Location<input required value={resourceForm.location} onChange={e => setResourceForm({...resourceForm,location:e.target.value})} placeholder="Building and floor"/></label><label>Description<textarea rows="3" value={resourceForm.description} onChange={e => setResourceForm({...resourceForm,description:e.target.value})} placeholder="What can this resource be used for?"/></label><button className="primary-btn" type="submit"><Plus size={16}/> Add resource</button></form></div><div className="panel"><div className="section-head"><div><h2>Resource inventory</h2><p>{resources.length} resources registered</p></div></div><div className="inventory-list">{resources.map(r=>{const Icon=iconFor(r.type);return <div className="inventory-item" key={r._id}><div className="inventory-icon"><Icon size={18}/></div><div className="inventory-info"><b>{r.name}</b><small>{r.type} · {r.location}</small></div><select aria-label={`Set status for ${r.name}`} value={r.status} onChange={async e=>{try{await request(`/resources/${r._id}`,{method:"PATCH",body:JSON.stringify({status:e.target.value})});await load();}catch(err){setNotice({type:"error",text:err.message});}}}><option>Available</option><option>Maintenance</option></select></div>})}</div></div></section>}

        <footer>CampusHub <span>·</span> Resource booking made simple <span className="footer-right">MERN stack demo</span></footer>
      </div>
    </main>

    {selected && <div className="modal-backdrop" onClick={e => {if(e.target === e.currentTarget)setSelected(null);}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">NEW RESERVATION</span><h2>Book {selected.name}</h2><p><MapPin size={14}/>{selected.location}</p></div><button className="close-btn" onClick={() => setSelected(null)}>×</button></div><form className="resource-form" onSubmit={createBooking}><label>Your full name<input required value={bookingForm.studentName} onChange={e=>setBookingForm({...bookingForm,studentName:e.target.value})} placeholder="Enter your name"/></label><label>College email<input required type="email" value={bookingForm.studentEmail} onChange={e=>setBookingForm({...bookingForm,studentEmail:e.target.value})} placeholder="you@college.edu"/></label><label>Purpose of booking<input required value={bookingForm.purpose} onChange={e=>setBookingForm({...bookingForm,purpose:e.target.value})} placeholder="e.g. Final year project"/></label><label>Date<input required type="date" min={today} value={bookingForm.date} onChange={e=>setBookingForm({...bookingForm,date:e.target.value})}/></label><div className="form-row"><label>Start time<input required type="time" value={bookingForm.startTime} onChange={e=>setBookingForm({...bookingForm,startTime:e.target.value})}/></label><label>End time<input required type="time" value={bookingForm.endTime} onChange={e=>setBookingForm({...bookingForm,endTime:e.target.value})}/></label></div><div className="modal-note"><Clock3 size={15}/> Overlapping pending or approved bookings are blocked automatically.</div><button className="primary-btn" type="submit"><CalendarCheck size={16}/> Submit booking request</button></form></div></div>}
  </div>;
}

function BookingTable({ bookings, role, cancel, updateStatus }) {
  if (!bookings.length) return <div className="empty"><CalendarCheck size={26}/><b>No bookings to show</b><p>Booking requests will appear here.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>RESOURCE / STUDENT</th><th>DATE & TIME</th><th>PURPOSE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{bookings.map(b=><tr key={b._id}><td><b>{b.resource?.name || "Resource"}</b><small>{b.studentName} · {b.studentEmail}</small></td><td>{new Date(`${b.date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}<small>{b.startTime}–{b.endTime}</small></td><td>{b.purpose}</td><td><span className={`status status-${b.status.toLowerCase()}`}><i/>{b.status}</span></td><td><div className="actions">{role === "Admin" && b.status === "Pending" && <><button className="approve-btn" title="Approve" onClick={()=>updateStatus(b._id,"Approved")}><CheckCircle2 size={16}/></button><button className="reject-btn" title="Reject" onClick={()=>updateStatus(b._id,"Rejected")}><XCircle size={16}/></button></>}{(role !== "Admin" || b.status === "Pending") && <button className="cancel-btn" title="Cancel booking" onClick={()=>cancel(b)}><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>;
}
