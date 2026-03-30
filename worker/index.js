// v2.1 - Generic room system + IAP (/iap/*)

// ── Google Play JWT 生成（Service Account 驗證用）─────────────────
async function makeGoogleJWT(svcAccount) {
  const header = btoa(JSON.stringify({alg:'RS256',typ:'JWT'})).replace(/=/g,'');
  const now = Math.floor(Date.now()/1000);
  const payload = btoa(JSON.stringify({
    iss: svcAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now+3600,
  })).replace(/=/g,'');
  const msg = `${header}.${payload}`;
  // import RSA private key
  const pemBody = svcAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/,'')
    .replace(/-----END PRIVATE KEY-----/,'')
    .replace(/\n/g,'');
  const keyBuf = Uint8Array.from(atob(pemBody), c=>c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyBuf, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(msg));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const jwt = `${msg}.${sig}`;
  // exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function rpsWinner(c1, c2) {
  if (c1 === c2) return 'draw';
  if ((c1==='rock'&&c2==='scissors')||(c1==='paper'&&c2==='rock')||(c1==='scissors'&&c2==='paper')) return 'p1';
  return 'p2';
}

const QUIZ_Q = [
  {q:'水豚（Capybara）是世界上最大的什麼動物？',a:['嚙齒動物','有袋動物','猛獸','爬蟲類'],c:0},
  {q:'地球繞太陽一圈大約需要幾天？',a:['265天','365天','465天','185天'],c:1},
  {q:'1+1+1×0+1 等於幾？',a:['0','1','3','2'],c:2},
  {q:'以下哪個是台灣的國花？',a:['玫瑰','梅花','菊花','蓮花'],c:1},
  {q:'光速約為每秒幾公里？',a:['30萬公里','3萬公里','3百公里','30億公里'],c:0},
  {q:'以下哪個國家的國旗是純紅色的？',a:['中國','日本','蒙古','吐瓦魯'],c:0},
  {q:'水的沸點在標準大氣壓下是幾度？',a:['90°C','80°C','100°C','110°C'],c:2},
  {q:'以下哪個不是足球場上的位置？',a:['前鋒','守門員','角衛','中場'],c:2},
  {q:'人類有幾根肋骨（成人）？',a:['20根','24根','28根','16根'],c:1},
  {q:'哪個星球是太陽系最大的行星？',a:['土星','天王星','木星','海王星'],c:2},
  {q:'以下哪種語言使用人數最多？',a:['英語','西班牙語','普通話','印地語'],c:2},
  {q:'鑽石的主要成分是什麼？',a:['矽','碳','氧','鐵'],c:1},
];

// ── 通用房間遊戲定義（新增遊戲只需在此加一個 key）────────────────
const GAME_DEFS = {
  rps: {
    play_state: 'choosing', play_ms: 10000, reveal_ms: 2500,
    match_wins: 2, total_rounds: null,
    initData: () => ({ p1_choice:'', p2_choice:'' }),
    onAct(room, data, pid, body) {
      const c = body.choice;
      if (!['rock','paper','scissors'].includes(c)) return false;
      if (room.p1_id===pid && !data.p1_choice) { data.p1_choice=c; return true; }
      if (room.p2_id===pid && !data.p2_choice) { data.p2_choice=c; return true; }
      return false;
    },
    shouldEndRound: d => !!(d.p1_choice && d.p2_choice),
    roundWinner(d) {
      const c1=d.p1_choice||'forfeit', c2=d.p2_choice||'forfeit';
      if (c1==='forfeit'&&c2==='forfeit') return 'draw';
      if (c1==='forfeit') return 'p2';
      if (c2==='forfeit') return 'p1';
      return rpsWinner(c1, c2);
    },
    resetRound: () => ({ p1_choice:'', p2_choice:'' }),
    serialize(d, state) {
      const show = state==='revealing'||state==='done';
      return { p1_chosen:!!d.p1_choice, p2_chosen:!!d.p2_choice,
               p1_choice:show?d.p1_choice:'', p2_choice:show?d.p2_choice:'' };
    },
  },
  quiz: {
    play_state: 'answering', play_ms: 8000, reveal_ms: 3000,
    match_wins: 3, total_rounds: 5,
    initData: () => ({ p1_answer:0, p2_answer:0, question_idx:Math.floor(Math.random()*QUIZ_Q.length) }),
    onAct(room, data, pid, body) {
      const a = parseInt(body.answer);
      if (a<1||a>4) return false;
      if (room.p1_id===pid && !data.p1_answer) { data.p1_answer=a; return true; }
      if (room.p2_id===pid && !data.p2_answer) { data.p2_answer=a; return true; }
      return false;
    },
    shouldEndRound: d => !!(d.p1_answer && d.p2_answer),
    roundWinner(d) {
      const q=QUIZ_Q[d.question_idx%QUIZ_Q.length];
      const p1r=d.p1_answer>0&&(d.p1_answer-1)===q.c, p2r=d.p2_answer>0&&(d.p2_answer-1)===q.c;
      if (p1r&&!p2r) return 'p1'; if (p2r&&!p1r) return 'p2'; return 'draw';
    },
    resetRound: d => ({ p1_answer:0, p2_answer:0, question_idx:(d.question_idx+1)%QUIZ_Q.length }),
    serialize(d, state) {
      const q=QUIZ_Q[d.question_idx%QUIZ_Q.length], show=state==='revealing'||state==='done';
      return { question:q.q, choices:q.a, question_idx:d.question_idx,
               correct_idx:show?q.c:-1, p1_answer:show?d.p1_answer:0, p2_answer:show?d.p2_answer:0 };
    },
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // ── 留言 ──────────────────────────────────────────────────────
    if (url.pathname==='/comments' && request.method==='GET') {
      const {results}=await env.DB.prepare('SELECT id,name,content,created_at,parent_id FROM comments ORDER BY created_at ASC LIMIT 200').all();
      return Response.json(results,{headers:cors});
    }
    if (url.pathname==='/comments' && request.method==='POST') {
      let b; try{b=await request.json();}catch{return Response.json({error:'格式錯誤'},{status:400,headers:cors});}
      const name=(b.name||'').trim().slice(0,50), content=(b.content||'').trim().slice(0,500);
      const parent_id=b.parent_id?parseInt(b.parent_id):null;
      if (!name||!content) return Response.json({error:'請填寫名稱和留言'},{status:400,headers:cors});
      await env.DB.prepare('INSERT INTO comments (name,content,created_at,parent_id) VALUES (?,?,?,?)').bind(name,content,new Date().toISOString(),parent_id).run();
      return Response.json({ok:true},{headers:cors});
    }
    const delM=url.pathname.match(/^\/comments\/(\d+)$/);
    if (delM && request.method==='DELETE') {
      const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
      if (!env.ADMIN_KEY||auth!==env.ADMIN_KEY) return Response.json({error:'權限不足'},{status:401,headers:cors});
      const id=parseInt(delM[1]);
      await env.DB.prepare('DELETE FROM comments WHERE parent_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM comments WHERE id=?').bind(id).run();
      return Response.json({ok:true},{headers:cors});
    }

    // ── 排行榜 ────────────────────────────────────────────────────
    const lbM=url.pathname.match(/^\/leaderboard\/([a-z0-9_-]+)$/);
    if (lbM && request.method==='GET') {
      const {results}=await env.DB.prepare('SELECT name,score,created_at FROM scores WHERE game=? ORDER BY score DESC LIMIT 10').bind(lbM[1]).all();
      return Response.json(results,{headers:cors});
    }
    if (lbM && request.method==='POST') {
      let b; try{b=await request.json();}catch{return Response.json({error:'格式錯誤'},{status:400,headers:cors});}
      const name=(b.name||'').trim().slice(0,30), score=parseInt(b.score);
      if (!name||isNaN(score)||score<0) return Response.json({error:'請填寫名稱與有效分數'},{status:400,headers:cors});
      await env.DB.prepare('INSERT INTO scores (game,name,score,created_at) VALUES (?,?,?,?)').bind(lbM[1],name,score,new Date().toISOString()).run();
      return Response.json({ok:true},{headers:cors});
    }

    // ── 彈幕 ──────────────────────────────────────────────────────
    if (url.pathname==='/danmaku' && request.method==='GET') {
      const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
      if (url.searchParams.get('admin')==='1' && auth==='66520') {
        const {results}=await env.DB.prepare('SELECT id,text,color,created_at FROM danmaku ORDER BY id DESC LIMIT 100').all();
        return Response.json(results,{headers:cors});
      }
      const since=parseInt(url.searchParams.get('since')||'0');
      const {results}=await env.DB.prepare('SELECT id,text,color,created_at FROM danmaku WHERE id>? ORDER BY id ASC LIMIT 60').bind(since).all();
      return Response.json(results,{headers:cors});
    }
    if (url.pathname==='/danmaku' && request.method==='POST') {
      let b; try{b=await request.json();}catch{return Response.json({error:'格式錯誤'},{status:400,headers:cors});}
      const text=(b.text||'').trim().slice(0,40);
      const allowed=['#ffffff','#ffd700','#00ffff','#ff69b4','#7fff00','#ff6347'];
      const color=allowed.includes(b.color)?b.color:'#ffffff';
      if (!text) return Response.json({error:'彈幕不能為空'},{status:400,headers:cors});
      await env.DB.prepare('INSERT INTO danmaku (text,color,created_at) VALUES (?,?,?)').bind(text,color,new Date().toISOString()).run();
      return Response.json({ok:true},{headers:cors});
    }
    if (url.pathname==='/danmaku/all' && request.method==='DELETE') {
      const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
      if (auth!=='66520') return Response.json({error:'未授權'},{status:401,headers:cors});
      await env.DB.prepare('DELETE FROM danmaku').run();
      return Response.json({ok:true},{headers:cors});
    }
    const dmDel=url.pathname.match(/^\/danmaku\/(\d+)$/);
    if (dmDel && request.method==='DELETE') {
      const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
      if (auth!=='66520') return Response.json({error:'未授權'},{status:401,headers:cors});
      await env.DB.prepare('DELETE FROM danmaku WHERE id=?').bind(parseInt(dmDel[1])).run();
      return Response.json({ok:true},{headers:cors});
    }

    // ── 水豚拔河 Match API ────────────────────────────────────────
    if (url.pathname==='/match/join' && request.method==='POST') {
      let b; try{b=await request.json();}catch{return Response.json({error:'bad request'},{status:400,headers:cors});}
      const pid=(b.pid||'').slice(0,40), name=(b.name||'玩家').trim().slice(0,20)||'玩家';
      if (!pid) return Response.json({error:'pid required'},{status:400,headers:cors});
      const now=Date.now();
      await env.DB.prepare('DELETE FROM match_rooms WHERE created_at<?').bind(now-600000).run();
      const ex=await env.DB.prepare("SELECT id,p1_id,p2_id,state FROM match_rooms WHERE (p1_id=? OR p2_id=?) AND state!='done' LIMIT 1").bind(pid,pid).first();
      if (ex) return Response.json({room_id:ex.id,role:ex.p1_id===pid?'p1':'p2',state:ex.state},{headers:cors});
      const wait=await env.DB.prepare("SELECT id,p1_id,p1_name FROM match_rooms WHERE state='waiting' LIMIT 1").first();
      if (wait && wait.p1_id!==pid) {
        const rs=now+3500, re=rs+30000;
        await env.DB.prepare('UPDATE match_rooms SET p2_id=?,p2_name=?,state=?,round_start=?,round_end=? WHERE id=?').bind(pid,name,'starting',rs,re,wait.id).run();
        return Response.json({room_id:wait.id,role:'p2',state:'starting',opp_name:wait.p1_name},{headers:cors});
      }
      const cnt=await env.DB.prepare("SELECT COUNT(*) as c FROM match_rooms WHERE state!='done'").first();
      if ((cnt?.c||0)>=10) return Response.json({error:'伺服器已滿，請稍後再試'},{status:503,headers:cors});
      const id=Math.random().toString(36).slice(2,8).toUpperCase();
      await env.DB.prepare('INSERT INTO match_rooms (id,p1_id,p1_name,state,created_at) VALUES (?,?,?,?,?)').bind(id,pid,name,'waiting',now).run();
      return Response.json({room_id:id,role:'p1',state:'waiting'},{headers:cors});
    }

    const matchGet=url.pathname.match(/^\/match\/([A-Z0-9]{6})$/);
    if (matchGet && request.method==='GET') {
      const room_id=matchGet[1], pid=url.searchParams.get('pid')||'', now=Date.now();
      const room=await env.DB.prepare('SELECT * FROM match_rooms WHERE id=?').bind(room_id).first();
      if (!room) return Response.json({error:'room not found'},{status:404,headers:cors});
      let {state,round,p1_wins,p2_wins,round_start,round_end,p1_taps,p2_taps,winner}=room;
      if (state==='starting'&&now>=round_start) {
        state='playing';
        await env.DB.prepare("UPDATE match_rooms SET state='playing' WHERE id=? AND state='starting'").bind(room_id).run();
      } else if (state==='playing') {
        const rp=Math.max(0,Math.min(100,50-(p1_taps-p2_taps)*0.6));
        const earlyWin=rp<=0?'p1':rp>=100?'p2':null;
        if (earlyWin||now>=round_end) {
          let rw=earlyWin||(p1_taps>=p2_taps?'p1':'p2');
          if (rw==='p1') p1_wins++; else p2_wins++;
          if (p1_wins>=2||p2_wins>=2) {
            state='done'; winner=p1_wins>=2?'p1':'p2';
            await env.DB.prepare("UPDATE match_rooms SET state='done',p1_wins=?,p2_wins=?,winner=? WHERE id=? AND state='playing'").bind(p1_wins,p2_wins,winner,room_id).run();
          } else {
            round++; const ns=now+3500,ne=ns+30000; state='starting';
            await env.DB.prepare("UPDATE match_rooms SET state='starting',round=?,p1_wins=?,p2_wins=?,p1_taps=0,p2_taps=0,round_start=?,round_end=? WHERE id=? AND state='playing'").bind(round,p1_wins,p2_wins,ns,ne,room_id).run();
            p1_taps=0; p2_taps=0; round_start=ns; round_end=ne;
          }
        }
      }
      const rope_pos=Math.max(0,Math.min(100,50-(p1_taps-p2_taps)*0.6));
      const role=room.p1_id===pid?'p1':'p2';
      const time_left=state==='playing'?Math.max(0,round_end-now):state==='starting'?Math.max(0,round_start-now):0;
      return Response.json({state,round,p1_wins,p2_wins,rope_pos,winner,role,p1_name:room.p1_name,p2_name:room.p2_name||null,time_left,p1_taps,p2_taps},{headers:cors});
    }

    const matchTap=url.pathname.match(/^\/match\/([A-Z0-9]{6})\/tap$/);
    if (matchTap && request.method==='POST') {
      const room_id=matchTap[1];
      let b; try{b=await request.json();}catch{return Response.json({ok:false},{headers:cors});}
      const pid=(b.pid||'').slice(0,40), taps=Math.max(0,Math.min(99999,parseInt(b.taps)||0));
      const room=await env.DB.prepare('SELECT p1_id,state FROM match_rooms WHERE id=?').bind(room_id).first();
      if (!room||room.state!=='playing') return Response.json({ok:false},{headers:cors});
      if (room.p1_id===pid) await env.DB.prepare('UPDATE match_rooms SET p1_taps=? WHERE id=?').bind(taps,room_id).run();
      else await env.DB.prepare('UPDATE match_rooms SET p2_taps=? WHERE id=?').bind(taps,room_id).run();
      return Response.json({ok:true},{headers:cors});
    }

    // ── 通用遊戲房間 API (/room/:type/*) ─────────────────────────
    // POST /room/:type/join
    const roomJoin=url.pathname.match(/^\/room\/([a-z]+)\/join$/);
    if (roomJoin && request.method==='POST') {
      const type=roomJoin[1], def=GAME_DEFS[type];
      if (!def) return Response.json({error:'unknown game type'},{status:404,headers:cors});
      let b; try{b=await request.json();}catch{return Response.json({error:'bad request'},{status:400,headers:cors});}
      const pid=(b.pid||'').slice(0,40), name=(b.name||'玩家').trim().slice(0,20)||'玩家';
      if (!pid) return Response.json({error:'pid required'},{status:400,headers:cors});
      const now=Date.now();
      await env.DB.prepare('DELETE FROM game_rooms WHERE game_type=? AND created_at<?').bind(type,now-600000).run();
      const ex=await env.DB.prepare("SELECT id,p1_id,p2_id,state FROM game_rooms WHERE game_type=? AND (p1_id=? OR p2_id=?) AND state!='done' LIMIT 1").bind(type,pid,pid).first();
      if (ex) return Response.json({room_id:ex.id,role:ex.p1_id===pid?'p1':'p2',state:ex.state},{headers:cors});
      const wait=await env.DB.prepare("SELECT id,p1_id,p1_name FROM game_rooms WHERE game_type=? AND state='waiting' LIMIT 1").bind(type).first();
      if (wait && wait.p1_id!==pid) {
        const rs=now+3500, re=rs+def.play_ms;
        await env.DB.prepare('UPDATE game_rooms SET p2_id=?,p2_name=?,state=?,round_start=?,round_end=? WHERE id=?').bind(pid,name,'starting',rs,re,wait.id).run();
        return Response.json({room_id:wait.id,role:'p2',state:'starting',opp_name:wait.p1_name},{headers:cors});
      }
      const cnt=await env.DB.prepare("SELECT COUNT(*) as c FROM game_rooms WHERE game_type=? AND state!='done'").bind(type).first();
      if ((cnt?.c||0)>=10) return Response.json({error:'伺服器已滿，請稍後再試'},{status:503,headers:cors});
      const id=Math.random().toString(36).slice(2,8).toUpperCase();
      const initData=JSON.stringify(def.initData());
      await env.DB.prepare('INSERT INTO game_rooms (id,game_type,p1_id,p1_name,state,data,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,type,pid,name,'waiting',initData,now).run();
      return Response.json({room_id:id,role:'p1',state:'waiting'},{headers:cors});
    }

    // GET /room/:type/:id?pid=
    const roomGet=url.pathname.match(/^\/room\/([a-z]+)\/([A-Z0-9]{6})$/);
    if (roomGet && request.method==='GET') {
      const type=roomGet[1], room_id=roomGet[2], def=GAME_DEFS[type];
      if (!def) return Response.json({error:'unknown game type'},{status:404,headers:cors});
      const pid=url.searchParams.get('pid')||'', now=Date.now();
      const room=await env.DB.prepare('SELECT * FROM game_rooms WHERE id=? AND game_type=?').bind(room_id,type).first();
      if (!room) return Response.json({error:'room not found'},{status:404,headers:cors});
      let {state,round,p1_wins,p2_wins,round_start,round_end,winner}=room;
      let data=JSON.parse(room.data||'{}');

      if (state==='starting' && now>=round_start) {
        state=def.play_state; round_end=round_start+def.play_ms;
        await env.DB.prepare('UPDATE game_rooms SET state=?,round_end=? WHERE id=? AND state=?').bind(state,round_end,room_id,'starting').run();
      } else if (state===def.play_state) {
        if (def.shouldEndRound(data)||now>=round_end) {
          const rw=def.roundWinner(data);
          if (rw==='p1') p1_wins++; else if (rw==='p2') p2_wins++;
          const reveal_end=now+def.reveal_ms;
          const matchOver=(def.match_wins&&(p1_wins>=def.match_wins||p2_wins>=def.match_wins))||(def.total_rounds&&round>=def.total_rounds);
          if (matchOver) {
            winner=p1_wins>p2_wins?'p1':p2_wins>p1_wins?'p2':'draw'; state='done';
            await env.DB.prepare('UPDATE game_rooms SET state=?,p1_wins=?,p2_wins=?,winner=? WHERE id=? AND state=?').bind('done',p1_wins,p2_wins,winner,room_id,def.play_state).run();
          } else {
            state='revealing'; round_start=reveal_end;
            await env.DB.prepare('UPDATE game_rooms SET state=?,round_start=?,p1_wins=?,p2_wins=? WHERE id=? AND state=?').bind('revealing',reveal_end,p1_wins,p2_wins,room_id,def.play_state).run();
          }
        }
      } else if (state==='revealing' && now>=round_start) {
        round++; const rs=now+3500, re=rs+def.play_ms;
        const newData={...data,...def.resetRound(data)};
        state='starting'; round_start=rs; round_end=re;
        await env.DB.prepare('UPDATE game_rooms SET state=?,round=?,data=?,round_start=?,round_end=? WHERE id=? AND state=?').bind('starting',round,JSON.stringify(newData),rs,re,room_id,'revealing').run();
        data=newData;
      }

      const role=room.p1_id===pid?'p1':'p2';
      const time_left=state===def.play_state?Math.max(0,round_end-now):state==='starting'?Math.max(0,round_start-now):0;
      return Response.json({
        state, round, p1_wins, p2_wins, winner, role,
        p1_name:room.p1_name, p2_name:room.p2_name||null, time_left,
        ...def.serialize(data, state),
      },{headers:cors});
    }

    // POST /room/:type/:id/act
    const roomAct=url.pathname.match(/^\/room\/([a-z]+)\/([A-Z0-9]{6})\/act$/);
    if (roomAct && request.method==='POST') {
      const type=roomAct[1], room_id=roomAct[2], def=GAME_DEFS[type];
      if (!def) return Response.json({ok:false},{headers:cors});
      let b; try{b=await request.json();}catch{return Response.json({ok:false},{headers:cors});}
      const pid=(b.pid||'').slice(0,40);
      const room=await env.DB.prepare('SELECT p1_id,p2_id,state,data FROM game_rooms WHERE id=? AND game_type=?').bind(room_id,type).first();
      if (!room||room.state!==def.play_state) return Response.json({ok:false},{headers:cors});
      const data=JSON.parse(room.data||'{}');
      if (!def.onAct(room,data,pid,b)) return Response.json({ok:false},{headers:cors});
      await env.DB.prepare('UPDATE game_rooms SET data=? WHERE id=?').bind(JSON.stringify(data),room_id).run();
      return Response.json({ok:true},{headers:cors});
    }

    // ── 流量追蹤 ──────────────────────────────────────────────────
    if (url.pathname==='/t' && request.method==='POST') {
      try {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, path TEXT NOT NULL, ref TEXT DEFAULT '', ua TEXT DEFAULT '', country TEXT DEFAULT '', lang TEXT DEFAULT '', screen TEXT DEFAULT '', sid TEXT DEFAULT '')").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_pv_ts ON page_views(ts)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_pv_path ON page_views(path)").run();
      } catch(e){}
      let b; try{b=await request.json();}catch{return Response.json({ok:true},{headers:cors});}
      const ts=Date.now();
      const path=(b.p||'/').slice(0,200);
      const ref=(b.r||'').slice(0,500);
      const ua=(request.headers.get('User-Agent')||'').slice(0,300);
      const country=request.headers.get('CF-IPCountry')||'';
      const lang=(b.l||'').slice(0,10);
      const screen=(b.s||'').slice(0,20);
      const sid=(b.sid||'').slice(0,40);
      await env.DB.prepare('INSERT INTO page_views (ts,path,ref,ua,country,lang,screen,sid) VALUES (?,?,?,?,?,?,?,?)').bind(ts,path,ref,ua,country,lang,screen,sid).run();
      return Response.json({ok:true},{headers:cors});
    }

    if (url.pathname==='/t/data' && request.method==='GET') {
      const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
      const adminKey=env.ADMIN_KEY||env.ANALYTICS_KEY||'';
      if (!adminKey||auth!==adminKey) return Response.json({error:'unauthorized'},{status:401,headers:cors});
      try {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, path TEXT NOT NULL, ref TEXT DEFAULT '', ua TEXT DEFAULT '', country TEXT DEFAULT '', lang TEXT DEFAULT '', screen TEXT DEFAULT '', sid TEXT DEFAULT '')").run();
      } catch(e){}
      const q=url.searchParams.get('q')||'overview';
      const days=Math.min(90,Math.max(1,parseInt(url.searchParams.get('days')||'7')));
      const since=Date.now()-days*86400000;

      if (q==='overview') {
        const total=await env.DB.prepare('SELECT COUNT(*) as c FROM page_views WHERE ts>?').bind(since).first();
        const uv=await env.DB.prepare('SELECT COUNT(DISTINCT sid) as c FROM page_views WHERE ts>? AND sid!=?').bind(since,'').first();
        const today_start=Date.now()-Date.now()%86400000;
        const today=await env.DB.prepare('SELECT COUNT(*) as c FROM page_views WHERE ts>?').bind(today_start).first();
        const active=await env.DB.prepare('SELECT COUNT(DISTINCT sid) as c FROM page_views WHERE ts>? AND sid!=?').bind(Date.now()-300000,'').first();
        return Response.json({total:total?.c||0,uv:uv?.c||0,today:today?.c||0,active:active?.c||0},{headers:cors});
      }
      if (q==='daily') {
        const {results}=await env.DB.prepare("SELECT CAST((ts/86400000) AS INTEGER) as day, COUNT(*) as pv, COUNT(DISTINCT sid) as uv FROM page_views WHERE ts>? GROUP BY day ORDER BY day").bind(since).all();
        return Response.json(results||[],{headers:cors});
      }
      if (q==='hourly') {
        const {results}=await env.DB.prepare("SELECT CAST((ts/3600000)%24 AS INTEGER) as hour, CAST(((ts/86400000)+4)%7 AS INTEGER) as dow, COUNT(*) as c FROM page_views WHERE ts>? GROUP BY hour, dow").bind(since).all();
        return Response.json(results||[],{headers:cors});
      }
      if (q==='pages') {
        const {results}=await env.DB.prepare('SELECT path, COUNT(*) as c, COUNT(DISTINCT sid) as uv FROM page_views WHERE ts>? GROUP BY path ORDER BY c DESC LIMIT 30').bind(since).all();
        return Response.json(results||[],{headers:cors});
      }
      if (q==='countries') {
        const {results}=await env.DB.prepare("SELECT country, COUNT(*) as c FROM page_views WHERE ts>? AND country!='' GROUP BY country ORDER BY c DESC LIMIT 30").bind(since).all();
        return Response.json(results||[],{headers:cors});
      }
      if (q==='devices') {
        const {results}=await env.DB.prepare('SELECT ua, COUNT(*) as c FROM page_views WHERE ts>? GROUP BY ua ORDER BY c DESC LIMIT 100').bind(since).all();
        // parse UA server-side into categories
        let mobile=0, desktop=0, tablet=0;
        const browsers={};
        for (const r of (results||[])) {
          const u=r.ua||'';
          if (/tablet|ipad/i.test(u)) tablet+=r.c;
          else if (/mobile|android|iphone/i.test(u)) mobile+=r.c;
          else desktop+=r.c;
          const bm=u.match(/(Chrome|Firefox|Safari|Edge|Opera|Samsung)/i);
          const bn=bm?bm[1]:'Other';
          browsers[bn]=(browsers[bn]||0)+r.c;
        }
        return Response.json({mobile,desktop,tablet,browsers},{headers:cors});
      }
      if (q==='referrers') {
        const {results}=await env.DB.prepare("SELECT ref, COUNT(*) as c FROM page_views WHERE ts>? AND ref!='' GROUP BY ref ORDER BY c DESC LIMIT 20").bind(since).all();
        return Response.json(results||[],{headers:cors});
      }
      if (q==='languages') {
        const {results}=await env.DB.prepare("SELECT lang, COUNT(*) as c FROM page_views WHERE ts>? AND lang!='' GROUP BY lang ORDER BY c DESC LIMIT 15").bind(since).all();
        return Response.json(results||[],{headers:cors});
      }
      return Response.json({error:'unknown query'},{status:400,headers:cors});
    }

    // ── 1對1情境聊天室 ────────────────────────────────────────────
    // POST /chat/join  { pid, name, gender }
    if (url.pathname==='/chat/join' && request.method==='POST') {
      let b; try{b=await request.json();}catch{return Response.json({error:'bad request'},{status:400,headers:cors});}
      const pid=(b.pid||'').slice(0,40), name=(b.name||'').trim().slice(0,20)||'匿名', gender=b.gender;
      if (!pid||!['male','female'].includes(gender)) return Response.json({error:'pid/gender required'},{status:400,headers:cors});
      // ensure tables exist (idempotent)
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS chat_rooms (id TEXT PRIMARY KEY, p1_id TEXT NOT NULL, p2_id TEXT, p1_name TEXT NOT NULL, p2_name TEXT, p1_gender TEXT NOT NULL, p2_gender TEXT, state TEXT NOT NULL DEFAULT 'waiting', scenario_id INTEGER NOT NULL DEFAULT 0, scenario_req TEXT, timer_end INTEGER, created_at INTEGER NOT NULL)").run();
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL, role TEXT NOT NULL, name TEXT NOT NULL, msg_type TEXT NOT NULL DEFAULT 'text', content TEXT NOT NULL, created_at INTEGER NOT NULL)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_cm_room ON chat_messages(room_id, id)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_cr_state ON chat_rooms(state)").run();
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p1_ping INTEGER DEFAULT 0").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p2_ping INTEGER DEFAULT 0").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p1_ip TEXT DEFAULT ''").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p1_country TEXT DEFAULT ''").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p1_ua TEXT DEFAULT ''").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p2_ip TEXT DEFAULT ''").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p2_country TEXT DEFAULT ''").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE chat_rooms ADD COLUMN p2_ua TEXT DEFAULT ''").run(); } catch(e){}
      const now=Date.now();
      const joinIp=request.headers.get('CF-Connecting-IP')||'';
      const joinCountry=request.headers.get('CF-IPCountry')||'';
      const joinUa=request.headers.get('User-Agent')||'';
      // clean up stale rooms
      await env.DB.prepare("DELETE FROM chat_rooms WHERE created_at<?").bind(now-3600000).run();
      // check if already in an active room
      const ex=await env.DB.prepare("SELECT id,p1_id,p2_id,state FROM chat_rooms WHERE (p1_id=? OR p2_id=?) AND state NOT IN ('done','cancelled') LIMIT 1").bind(pid,pid).first();
      if (ex) return Response.json({room_id:ex.id,role:ex.p1_id===pid?'p1':'p2',state:ex.state},{headers:cors});
      // find opposite gender waiting room（跳過殭屍：60秒內沒ping且建立超過60秒）
      const opp=gender==='male'?'female':'male';
      const wait=await env.DB.prepare("SELECT id,p1_id,p1_name FROM chat_rooms WHERE state='waiting' AND p1_gender=? AND NOT(p1_ping=0 AND created_at<?) AND (p1_ping=0 OR p1_ping>?) LIMIT 1").bind(opp,now-60000,now-90000).first();
      if (wait && wait.p1_id!==pid) {
        const timer_end=now+300000;
        // conditional UPDATE to prevent race condition + include IP/country/UA
        const upd=await env.DB.prepare("UPDATE chat_rooms SET p2_id=?,p2_name=?,p2_gender=?,state='chatting',timer_end=?,p2_ip=?,p2_country=?,p2_ua=? WHERE id=? AND state='waiting'").bind(pid,name,gender,timer_end,joinIp,joinCountry,joinUa,wait.id).run();
        if ((upd.meta?.changes||0)>0) {
          return Response.json({room_id:wait.id,role:'p2',state:'chatting',opp_name:wait.p1_name},{headers:cors});
        }
        // another user grabbed that room first — fall through to create new waiting room
      }
      const cnt=await env.DB.prepare("SELECT COUNT(*) as c FROM chat_rooms WHERE state='waiting'").first();
      if ((cnt?.c||0)>=20) return Response.json({error:'等待人數已滿，請稍後再試'},{status:503,headers:cors});
      const id=Math.random().toString(36).slice(2,8).toUpperCase();
      await env.DB.prepare("INSERT INTO chat_rooms (id,p1_id,p1_name,p1_gender,state,created_at,p1_ip,p1_country,p1_ua) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,pid,name,gender,'waiting',now,joinIp,joinCountry,joinUa).run();
      return Response.json({room_id:id,role:'p1',state:'waiting'},{headers:cors});
    }

    // GET /chat/:id?pid=
    const chatGet=url.pathname.match(/^\/chat\/([A-Z0-9]{6})$/);
    if (chatGet && request.method==='GET') {
      const room_id=chatGet[1], pid=url.searchParams.get('pid')||'', last_msg=parseInt(url.searchParams.get('last')||'0');
      const now=Date.now();
      const room=await env.DB.prepare('SELECT * FROM chat_rooms WHERE id=?').bind(room_id).first();
      if (!room) return Response.json({error:'room not found'},{status:404,headers:cors});
      // 更新自己的心跳
      const role=room.p1_id===pid?'p1':'p2';
      if (role==='p1') { try{await env.DB.prepare("UPDATE chat_rooms SET p1_ping=? WHERE id=?").bind(now,room_id).run();}catch(e){} }
      if (role==='p2') { try{await env.DB.prepare("UPDATE chat_rooms SET p2_ping=? WHERE id=?").bind(now,room_id).run();}catch(e){} }
      let {state,timer_end}=room;
      if (state==='chatting' && timer_end && now>=timer_end) {
        state='done';
        await env.DB.prepare("UPDATE chat_rooms SET state='done' WHERE id=? AND state='chatting'").bind(room_id).run();
      }
      const msgs=await env.DB.prepare('SELECT id,role,name,msg_type,content,created_at FROM chat_messages WHERE room_id=? AND id>? ORDER BY id ASC LIMIT 80').bind(room_id,last_msg).all();
      // 判斷對方是否在線（90秒內有ping）
      const oppPing = role==='p1'? room.p2_ping : room.p1_ping;
      const opp_online = oppPing && oppPing > now-90000;
      return Response.json({
        state, role, scenario_id:room.scenario_id, scenario_req:room.scenario_req?JSON.parse(room.scenario_req):null,
        p1_name:room.p1_name, p2_name:room.p2_name||null,
        p1_gender:room.p1_gender, p2_gender:room.p2_gender||null,
        time_left:state==='chatting'?Math.max(0,timer_end-now):0,
        messages:(msgs.results||[]),
        opp_online: !!opp_online,
      },{headers:cors});
    }

    // POST /chat/:id/leave  { pid }
    const chatLeave=url.pathname.match(/^\/chat\/([A-Z0-9]{6})\/leave$/);
    if (chatLeave && request.method==='POST') {
      const room_id=chatLeave[1];
      let b; try{b=await request.json();}catch{b={};}
      const pid=(b.pid||'').slice(0,40);
      const room=await env.DB.prepare("SELECT p1_id,p2_id,state FROM chat_rooms WHERE id=?").bind(room_id).first();
      if (!room) return Response.json({ok:true},{headers:cors});
      const isP1=room.p1_id===pid, isP2=room.p2_id===pid;
      if (!isP1 && !isP2) return Response.json({ok:true},{headers:cors});
      if (room.state==='waiting' && isP1) {
        await env.DB.prepare("UPDATE chat_rooms SET state='done' WHERE id=?").bind(room_id).run();
      } else if (room.state==='chatting') {
        // one side left → mark done so other side's poll detects it
        await env.DB.prepare("UPDATE chat_rooms SET state='done' WHERE id=?").bind(room_id).run();
      }
      return Response.json({ok:true},{headers:cors});
    }

    // POST /chat/:id/msg  { pid, type, content }
    const chatMsg=url.pathname.match(/^\/chat\/([A-Z0-9]{6})\/msg$/);
    if (chatMsg && request.method==='POST') {
      const room_id=chatMsg[1];
      let b; try{b=await request.json();}catch{return Response.json({ok:false},{headers:cors});}
      const pid=(b.pid||'').slice(0,40);
      const room=await env.DB.prepare("SELECT p1_id,p2_id,p1_name,p2_name,state FROM chat_rooms WHERE id=?").bind(room_id).first();
      if (!room||room.state!=='chatting') return Response.json({ok:false,error:'not in chat'},{headers:cors});
      const role=room.p1_id===pid?'p1':room.p2_id===pid?'p2':null;
      if (!role) return Response.json({ok:false},{headers:cors});
      const name=role==='p1'?room.p1_name:room.p2_name;
      const msg_type=['text','sticker'].includes(b.type)?b.type:'text';
      const content=(b.content||'').trim().slice(0,200);
      if (!content) return Response.json({ok:false},{headers:cors});
      await env.DB.prepare('INSERT INTO chat_messages (room_id,role,name,msg_type,content,created_at) VALUES (?,?,?,?,?,?)').bind(room_id,role,name,msg_type,content,Date.now()).run();
      return Response.json({ok:true},{headers:cors});
    }

    // POST /chat/:id/scene  { pid, action, scene_id }
    const chatScene=url.pathname.match(/^\/chat\/([A-Z0-9]{6})\/scene$/);
    if (chatScene && request.method==='POST') {
      const room_id=chatScene[1];
      let b; try{b=await request.json();}catch{return Response.json({ok:false},{headers:cors});}
      const pid=(b.pid||'').slice(0,40), action=b.action;
      const room=await env.DB.prepare("SELECT p1_id,p2_id,state,scenario_req FROM chat_rooms WHERE id=?").bind(room_id).first();
      if (!room||room.state!=='chatting') return Response.json({ok:false},{headers:cors});
      const role=room.p1_id===pid?'p1':room.p2_id===pid?'p2':null;
      if (!role) return Response.json({ok:false},{headers:cors});
      if (action==='propose') {
        const scene_id=parseInt(b.scene_id)||0;
        if (scene_id<1||scene_id>6) return Response.json({ok:false},{headers:cors});
        const req=JSON.stringify({proposer:role,scene_id});
        await env.DB.prepare("UPDATE chat_rooms SET scenario_req=? WHERE id=?").bind(req,room_id).run();
        return Response.json({ok:true},{headers:cors});
      }
      if (action==='accept') {
        const req=room.scenario_req?JSON.parse(room.scenario_req):null;
        if (!req||req.proposer===role) return Response.json({ok:false},{headers:cors});
        await env.DB.prepare("UPDATE chat_rooms SET scenario_id=?,scenario_req=NULL WHERE id=?").bind(req.scene_id,room_id).run();
        return Response.json({ok:true},{headers:cors});
      }
      if (action==='reject') {
        await env.DB.prepare("UPDATE chat_rooms SET scenario_req=NULL WHERE id=?").bind(room_id).run();
        return Response.json({ok:true},{headers:cors});
      }
      return Response.json({ok:false},{headers:cors});
    }

    // DELETE /chat/admin/:room_id  (強制關閉房間)
    const adminClose=url.pathname.match(/^\/chat\/admin\/([A-Z0-9]{6})$/);
    if (adminClose && request.method==='DELETE') {
      const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
      if (!env.ADMIN_KEY||auth!==env.ADMIN_KEY) return Response.json({error:'unauthorized'},{status:401,headers:cors});
      const room_id=adminClose[1];
      await env.DB.prepare("UPDATE chat_rooms SET state='done' WHERE id=? AND state!='done'").bind(room_id).run();
      return Response.json({ok:true},{headers:cors});
    }

    // GET /chat/admin  (requires Authorization: Bearer {ADMIN_KEY})
    if (url.pathname==='/chat/admin' && request.method==='GET') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
      const now=Date.now();
      const twTime = new Date(now+8*3600000).toISOString().replace('T',' ').slice(0,19)+' (台灣)';

      // 建立登入紀錄表（首次）
      try { await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_login_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT, success INTEGER, created_at INTEGER)").run(); } catch(e){}

      // 暴力破解防護：10分鐘內同 IP 失敗 >= 5 次 → 封鎖
      let failCount=0;
      try {
        const fr=await env.DB.prepare("SELECT COUNT(*) as n FROM admin_login_log WHERE ip=? AND success=0 AND created_at>?").bind(ip,now-600000).first();
        failCount=fr?fr.n:0;
      } catch(e){}
      if (failCount>=5) {
        if(env.DISCORD_WEBHOOK) { try { await fetch(env.DISCORD_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`🚫 **後台封鎖警告** | IP \`${ip}\` 短時間嘗試 ${failCount} 次，已鎖定 | ${twTime}`})}); } catch(e){} }
        return Response.json({error:'too many attempts, blocked 10min'},{status:429,headers:cors});
      }

      if (!env.ADMIN_KEY||auth!==env.ADMIN_KEY) {
        // 記錄失敗
        try { await env.DB.prepare("INSERT INTO admin_login_log (ip,success,created_at) VALUES (?,0,?)").bind(ip,now).run(); } catch(e){}
        const newFail=failCount+1;
        if(newFail>=3 && env.DISCORD_WEBHOOK) { try { await fetch(env.DISCORD_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`⚠️ **後台登入失敗** | IP \`${ip}\` 第 ${newFail} 次錯誤 | ${twTime}`})}); } catch(e){} }
        return Response.json({error:'unauthorized'},{status:401,headers:cors});
      }

      // 登入成功
      try { await env.DB.prepare("INSERT INTO admin_login_log (ip,success,created_at) VALUES (?,1,?)").bind(ip,now).run(); } catch(e){}
      if(env.DISCORD_WEBHOOK) { try { await fetch(env.DISCORD_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`✅ **後台登入成功** | IP \`${ip}\` | ${twTime}`})}); } catch(e){} }

      let rooms=[], totalWaiting=0, totalChatting=0;
      try {
        const res=await env.DB.prepare("SELECT * FROM chat_rooms WHERE created_at>? ORDER BY created_at DESC").bind(now-3600000).all();
        for (const room of (res.results||[])) {
          if(room.state==='waiting') totalWaiting++;
          if(room.state==='chatting') totalChatting++;
          let msgs=[];
          try {
            const mr=await env.DB.prepare("SELECT id,role,name,msg_type,content,created_at FROM chat_messages WHERE room_id=? ORDER BY id DESC LIMIT 30").bind(room.id).all();
            msgs=(mr.results||[]).reverse();
          } catch(e){}
          rooms.push({...room, messages:msgs});
        }
      } catch(e){ return Response.json({error:'tables not yet created, no chats yet'},{headers:cors}); }
      return Response.json({rooms,totalWaiting,totalChatting,now},{headers:cors});
    }

    // ── IAP 內購系統 ───────────────────────────────────────────────
    // D1 tables: iap_users, iap_purchases (auto-created on first call)
    if (url.pathname.startsWith('/iap/')) {
      // ensure tables
      try {
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS iap_users (
          id TEXT PRIMARY KEY,
          device_id TEXT UNIQUE NOT NULL,
          gems INTEGER NOT NULL DEFAULT 0,
          total_spent_gems INTEGER NOT NULL DEFAULT 0,
          total_purchased INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`).run();
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS iap_purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          order_id TEXT UNIQUE,
          purchase_token TEXT,
          gems_granted INTEGER NOT NULL DEFAULT 0,
          price_micros INTEGER NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'TWD',
          platform TEXT NOT NULL DEFAULT 'android',
          status TEXT NOT NULL DEFAULT 'pending',
          receipt TEXT,
          created_at INTEGER NOT NULL,
          verified_at INTEGER
        )`).run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_iap_usr_dev ON iap_users(device_id)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_iap_pur_usr ON iap_purchases(user_id)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_iap_pur_ord ON iap_purchases(order_id)").run();
      } catch(e){}

      // ── 商品清單 ──
      const IAP_PRODUCTS = [
        { id:'gems_100',  gems:100,  price:'NT$30',  price_micros:30000000,  currency:'TWD', bonus:0,   label_zh:'💎 100 寶石',        label_en:'💎 100 Gems' },
        { id:'gems_500',  gems:600,  price:'NT$150', price_micros:150000000, currency:'TWD', bonus:20,  label_zh:'💎 500+100 寶石',    label_en:'💎 500+100 Gems' },
        { id:'gems_1200', gems:1680, price:'NT$300', price_micros:300000000, currency:'TWD', bonus:40,  label_zh:'💎 1200+480 寶石',   label_en:'💎 1200+480 Gems' },
        { id:'monthly',   gems:30,   price:'NT$60/月', price_micros:60000000, currency:'TWD', bonus:0, label_zh:'🎫 月卡 (每日30💎)', label_en:'🎫 Monthly (30💎/day)', type:'subscription' },
        { id:'no_ads',    gems:0,    price:'NT$90',  price_micros:90000000,  currency:'TWD', bonus:0,   label_zh:'🚫 去廣告 (永久)',   label_en:'🚫 Remove Ads', type:'lifetime' },
      ];

      // GET /iap/products
      if (url.pathname==='/iap/products' && request.method==='GET') {
        return Response.json(IAP_PRODUCTS, {headers:cors});
      }

      // POST /iap/register  { device_id }
      if (url.pathname==='/iap/register' && request.method==='POST') {
        let b; try{b=await request.json();}catch{return Response.json({error:'bad request'},{status:400,headers:cors});}
        const device_id=(b.device_id||'').trim().slice(0,80);
        if (!device_id) return Response.json({error:'device_id required'},{status:400,headers:cors});
        const now=Date.now();
        // check existing
        const existing=await env.DB.prepare('SELECT id,gems,total_spent_gems,total_purchased,created_at FROM iap_users WHERE device_id=?').bind(device_id).first();
        if (existing) return Response.json({user:existing},{headers:cors});
        // create new
        const uid='u_'+Math.random().toString(36).slice(2,14);
        await env.DB.prepare('INSERT INTO iap_users (id,device_id,gems,total_spent_gems,total_purchased,created_at,updated_at) VALUES (?,?,0,0,0,?,?)').bind(uid,device_id,now,now).run();
        return Response.json({user:{id:uid,gems:0,total_spent_gems:0,total_purchased:0,created_at:now}},{headers:cors});
      }

      // GET /iap/user?uid=xxx
      if (url.pathname==='/iap/user' && request.method==='GET') {
        const uid=url.searchParams.get('uid')||'';
        if (!uid) return Response.json({error:'uid required'},{status:400,headers:cors});
        const user=await env.DB.prepare('SELECT id,gems,total_spent_gems,total_purchased,created_at FROM iap_users WHERE id=?').bind(uid).first();
        if (!user) return Response.json({error:'user not found'},{status:404,headers:cors});
        return Response.json({user},{headers:cors});
      }

      // POST /iap/verify  { uid, product_id, order_id, purchase_token, receipt }
      // Google Play receipt verification
      if (url.pathname==='/iap/verify' && request.method==='POST') {
        let b; try{b=await request.json();}catch{return Response.json({error:'bad request'},{status:400,headers:cors});}
        const uid=(b.uid||'').trim(), product_id=(b.product_id||'').trim();
        const order_id=(b.order_id||'').trim(), purchase_token=(b.purchase_token||'').trim();
        if (!uid||!product_id||!order_id) return Response.json({error:'missing fields'},{status:400,headers:cors});

        // check user exists
        const user=await env.DB.prepare('SELECT id,gems FROM iap_users WHERE id=?').bind(uid).first();
        if (!user) return Response.json({error:'user not found'},{status:404,headers:cors});

        // check duplicate order
        const dup=await env.DB.prepare('SELECT id FROM iap_purchases WHERE order_id=?').bind(order_id).first();
        if (dup) return Response.json({error:'order already processed',gems:user.gems},{status:409,headers:cors});

        // find product
        const product=IAP_PRODUCTS.find(p=>p.id===product_id);
        if (!product) return Response.json({error:'unknown product'},{status:400,headers:cors});

        const now=Date.now();
        let verified=false;

        // Google Play Server-Side Verification
        // Requires GOOGLE_PLAY_KEY (service account JSON) in env
        if (env.GOOGLE_PLAY_KEY && purchase_token) {
          try {
            const svcAccount=JSON.parse(env.GOOGLE_PLAY_KEY);
            const jwt = await makeGoogleJWT(svcAccount);
            const pkg = env.ANDROID_PACKAGE || 'com.capyworlds.app';
            const gpUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${product_id}/tokens/${purchase_token}`;
            const gpRes = await fetch(gpUrl, { headers:{'Authorization':`Bearer ${jwt}`} });
            if (gpRes.ok) {
              const gpData = await gpRes.json();
              // purchaseState: 0=purchased, 1=canceled, 2=pending
              if (gpData.purchaseState===0) verified=true;
            }
          } catch(e) {
            // verification failed, fall through to sandbox mode
          }
        }

        // Sandbox/dev mode: if no GOOGLE_PLAY_KEY configured, auto-verify
        // (Remove this in production!)
        if (!env.GOOGLE_PLAY_KEY) {
          verified=true;
        }

        if (!verified) {
          await env.DB.prepare('INSERT INTO iap_purchases (user_id,product_id,order_id,purchase_token,gems_granted,price_micros,currency,platform,status,receipt,created_at) VALUES (?,?,?,?,0,?,?,?,?,?,?)').bind(uid,product_id,order_id,purchase_token,product.price_micros,product.currency,'android','failed',b.receipt||'',now).run();
          return Response.json({error:'verification failed',gems:user.gems},{status:402,headers:cors});
        }

        // Grant gems
        const gemsToGrant=product.gems;
        const newGems=user.gems+gemsToGrant;
        await env.DB.prepare('UPDATE iap_users SET gems=?,total_purchased=total_purchased+1,updated_at=? WHERE id=?').bind(newGems,now,uid).run();
        await env.DB.prepare('INSERT INTO iap_purchases (user_id,product_id,order_id,purchase_token,gems_granted,price_micros,currency,platform,status,receipt,created_at,verified_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(uid,product_id,order_id,purchase_token,gemsToGrant,product.price_micros,product.currency,'android','verified',b.receipt||'',now,now).run();

        return Response.json({ok:true,gems:newGems,granted:gemsToGrant},{headers:cors});
      }

      // POST /iap/spend  { uid, amount, reason }
      if (url.pathname==='/iap/spend' && request.method==='POST') {
        let b; try{b=await request.json();}catch{return Response.json({error:'bad request'},{status:400,headers:cors});}
        const uid=(b.uid||'').trim(), amount=parseInt(b.amount)||0, reason=(b.reason||'').slice(0,100);
        if (!uid||amount<=0) return Response.json({error:'invalid params'},{status:400,headers:cors});
        const user=await env.DB.prepare('SELECT id,gems FROM iap_users WHERE id=?').bind(uid).first();
        if (!user) return Response.json({error:'user not found'},{status:404,headers:cors});
        if (user.gems<amount) return Response.json({error:'insufficient gems',gems:user.gems},{status:402,headers:cors});
        const newGems=user.gems-amount;
        await env.DB.prepare('UPDATE iap_users SET gems=?,total_spent_gems=total_spent_gems+?,updated_at=? WHERE id=?').bind(newGems,amount,Date.now(),uid).run();
        return Response.json({ok:true,gems:newGems,spent:amount},{headers:cors});
      }

      // GET /iap/history?uid=xxx
      if (url.pathname==='/iap/history' && request.method==='GET') {
        const uid=url.searchParams.get('uid')||'';
        if (!uid) return Response.json({error:'uid required'},{status:400,headers:cors});
        const {results}=await env.DB.prepare('SELECT product_id,order_id,gems_granted,status,created_at FROM iap_purchases WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(uid).all();
        return Response.json(results||[],{headers:cors});
      }

      // GET /iap/admin  (requires ADMIN_KEY)
      if (url.pathname==='/iap/admin' && request.method==='GET') {
        const auth=(request.headers.get('Authorization')||'').replace('Bearer ','');
        if (!env.ADMIN_KEY||auth!==env.ADMIN_KEY) return Response.json({error:'unauthorized'},{status:401,headers:cors});
        const days=parseInt(url.searchParams.get('days')||'7');
        const since=Date.now()-days*86400000;
        const totalUsers=await env.DB.prepare('SELECT COUNT(*) as c FROM iap_users').first();
        const totalRevenue=await env.DB.prepare('SELECT SUM(price_micros) as s, COUNT(*) as c FROM iap_purchases WHERE status=? AND created_at>?').bind('verified',since).first();
        const recentPurchases=await env.DB.prepare('SELECT p.product_id,p.gems_granted,p.price_micros,p.currency,p.status,p.created_at,u.device_id FROM iap_purchases p JOIN iap_users u ON p.user_id=u.id WHERE p.created_at>? ORDER BY p.created_at DESC LIMIT 50').bind(since).all();
        return Response.json({
          total_users:totalUsers?.c||0,
          period_revenue_micros:totalRevenue?.s||0,
          period_purchases:totalRevenue?.c||0,
          recent:(recentPurchases.results||[]),
        },{headers:cors});
      }

      return Response.json({error:'not found'},{status:404,headers:cors});
    }

    // ── 社群趨勢代理 (/trends/:source) ────────────────────────────
    // 用 CF Cache API 快取 4 小時，避免重複打外部 API
    // Reddit 被 CF Worker IP 封鎖（.json 和 .rss 都擋），改用遊戲媒體 RSS
    const TREND_SOURCES = {
      // HackerNews Algolia API — 完全公開，不擋 Server IP
      '/trends/hn-gaming':  { url:'https://hn.algolia.com/api/v1/search?tags=story&query=game+gaming&hitsPerPage=30', type:'application/json;charset=utf-8' },
      '/trends/hn-steam':   { url:'https://hn.algolia.com/api/v1/search?tags=story&query=steam+game&hitsPerPage=20', type:'application/json;charset=utf-8' },
      '/trends/hn-indie':   { url:'https://hn.algolia.com/api/v1/search?tags=story&query=indie+game&hitsPerPage=20', type:'application/json;charset=utf-8' },
      // 遊戲媒體 RSS（備用，可能被擋）
      '/trends/news-rps':      { url:'https://www.rockpapershotgun.com/feed', type:'application/xml;charset=utf-8' },
      '/trends/news-pcgamer':  { url:'https://www.pcgamer.com/rss/', type:'application/xml;charset=utf-8' },
      // Steam — 官方公開 API，不需 key
      '/trends/steam-featured':  { url:'https://store.steampowered.com/api/featured/', type:'application/json;charset=utf-8' },
      '/trends/steam-top':       { url:'https://store.steampowered.com/api/featuredcategories/', type:'application/json;charset=utf-8' },
      // SteamSpy — 專門提供遊戲數據的公開 API
      '/trends/steamspy-top':    { url:'https://steamspy.com/api.php?request=top100in2weeks', type:'application/json;charset=utf-8' },
      // CheapShark — 遊戲特價比價 API
      '/trends/deals':           { url:'https://www.cheapshark.com/api/1.0/deals?storeID=1&upperPrice=15&sortBy=recent&pageSize=20', type:'application/json;charset=utf-8' },
    };
    const trendSrc = TREND_SOURCES[url.pathname];
    if (trendSrc && request.method==='GET') {
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      // 先查快取
      let cached = await cache.match(cacheKey);
      if (cached) {
        // 加上 CORS headers（快取的 response 可能沒有）
        const body = await cached.text();
        return new Response(body, { headers:{...cors,'Content-Type':trendSrc.type,'X-Cache':'HIT'} });
      }
      // 快取沒有 → 打外部 API
      try {
        const r = await fetch(trendSrc.url, { headers:{'User-Agent':'Mozilla/5.0',...(trendSrc.extraHeaders||{})} });
        const body = await r.text();
        const resp = new Response(body, { headers:{...cors,'Content-Type':trendSrc.type,'Cache-Control':'public, max-age=14400','X-Cache':'MISS'} });
        // 存入快取（4小時 = 14400秒）
        const cacheResp = new Response(body, { headers:{'Content-Type':trendSrc.type,'Cache-Control':'public, max-age=14400'} });
        await cache.put(cacheKey, cacheResp);
        return resp;
      } catch(e){ return Response.json({error:'fetch failed'},{status:502,headers:cors}); }
    }

    return env.ASSETS.fetch(request);
  }
};
