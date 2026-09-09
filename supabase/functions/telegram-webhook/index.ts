import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const token = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const api = (method:string) => `https://api.telegram.org/bot${token}/${method}`;
const json = (body:unknown) => new Response(JSON.stringify(body), {headers:{'content-type':'application/json'}});

async function send(chat_id:number, text:string, reply_markup?:unknown){ await fetch(api('sendMessage'), {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id,text,reply_markup})}); }
async function handle(update:any){
  const message=update.message; if(!message?.chat?.id) return;
  const chatId=message.chat.id; const text=(message.text??'').trim();
  await supabase.from('telegram_updates').upsert({update_id:update.update_id,chat_id:chatId},{onConflict:'update_id'});
  const {data:profile}=await supabase.from('profiles').select('id').eq('telegram_group_id',chatId).maybeSingle();
  if(!profile){ return send(chatId,'Chưa liên kết nhóm này. Mở web app → Settings để liên kết Telegram.'); }
  if(text==='/start'||text==='/help') return send(chatId,'Self Reminder\n/new — tạo lịch\n/list — xem lịch\n/cancel — huỷ thao tác',{inline_keyboard:[[{text:'＋ Tạo lịch',callback_data:'wizard:new'}],[{text:'📋 Danh sách',callback_data:'wizard:list'}]]});
  if(text==='/list') { const {data}=await supabase.from('reminders').select('title,next_occurrence_at').eq('owner_id',profile.id).eq('status','active').order('next_occurrence_at').limit(10); return send(chatId,(data??[]).map((r:any)=>`• ${r.title} — ${new Date(r.next_occurrence_at).toLocaleString('vi-VN')}`).join('\n')||'Chưa có lịch.'); }
  if(text==='/new') return send(chatId,'Chọn loại lịch:',{inline_keyboard:[[{text:'Cá nhân',callback_data:'wizard:type:personal'},{text:'Sinh nhật',callback_data:'wizard:type:birthday'},{text:'Thực phẩm',callback_data:'wizard:type:food'}]]});
  if(text==='/cancel') { await supabase.from('telegram_drafts').delete().eq('owner_id',profile.id).eq('chat_id',chatId); return send(chatId,'Đã huỷ thao tác.'); }
  return send(chatId,'Mình chưa hiểu. Dùng /new hoặc /list.');
}

Deno.serve(async req => { try { const update=await req.json(); await handle(update); return json({ok:true}); } catch (e) { console.error(e); return json({ok:false}); } });
