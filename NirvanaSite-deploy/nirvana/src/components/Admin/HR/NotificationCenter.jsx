import React, { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";
import { getHrSummary, hrAction } from "../../../lib/hrApi";

export default function NotificationCenter() {
  const [notices, setNotices] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { getHrSummary().then((data) => setNotices(data.notifications || [])).catch(() => {}); }, []);
  const unread = notices.filter((notice) => !notice.read_at).length;
  const markRead = async () => {
    await hrAction("mark_notifications_read");
    setNotices((current) => current.map((notice) => ({ ...notice, read_at: notice.read_at || new Date().toISOString() })));
  };
  return <div style={{position:'relative'}}>
    <button aria-label="Notifications" onClick={()=>setOpen(!open)} style={{position:'relative',border:'1px solid #e2e8f0',background:'#fff',borderRadius:10,padding:'10px 12px',color:'#425b3d',cursor:'pointer'}}><FaBell />{unread>0&&<span style={{position:'absolute',right:-5,top:-7,minWidth:18,height:18,borderRadius:20,background:'#e11d48',color:'#fff',fontSize:10,fontWeight:800,display:'grid',placeItems:'center'}}>{unread}</span>}</button>
    {open&&<div style={{position:'absolute',right:0,top:46,zIndex:80,width:'min(360px,80vw)',maxHeight:420,overflow:'auto',background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,boxShadow:'0 18px 45px rgba(15,23,42,.18)',padding:12}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 4px 10px'}}><strong>Notifications</strong>{unread>0&&<button onClick={markRead} style={{border:0,background:'none',color:'#426743',cursor:'pointer'}}>Mark all read</button>}</div>{notices.slice(0,10).map((notice)=><a key={notice.id} href={notice.action_url||'/admin/profile'} style={{display:'block',padding:11,borderRadius:9,background:notice.read_at?'transparent':'#f2f7f2',color:'#1e293b',textDecoration:'none',marginBottom:5}}><strong style={{display:'block',fontSize:'12px'}}>{notice.title}</strong><span style={{fontSize:12,color:'#64748b'}}>{notice.message}</span></a>)}{!notices.length&&<div style={{padding:20,textAlign:'center',color:'#64748b'}}>No notifications</div>}</div>}
  </div>;
}
