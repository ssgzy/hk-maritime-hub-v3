// V2 readers. No external libraries, API keys, fake observations or bundled snapshots.
const FEEDS=DATA.feeds;
const LIVE={selected:'wind',group:'all',records:{},auto:true,table:0,page:1,query:'',metric:'',mode:'detecting',lastAuto:0,
 params:{lat:'22.10',lon:'114.20',date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),station:'QUB'}};
const FEED_GROUPS={all:'全部连接器',observation:'实测与观测报告',warning:'警告与提示',forecast:'天气与海洋预报',traffic:'港口船舶日报',reference:'静态参考字典'};
const EXTERNAL_GROUPS={conditional:['条件查询 / 年份待核验','已提供查询入口，但当前年份的实际数据覆盖尚待接口确认。'],download:['下载或空间服务待接入','有资料下载或空间服务的可能性；本版未取得和验证具体数据端点，不等于这些数据永远不能接入。'],historical:['历史 / 静态资料','可以用于独立预览和回放，但不应标为实时观测。'],account:['账户、密钥或后端处理','缺少凭证、授权核验或数据裁切流程，暂不冒充已在线。'],license:['订阅 / 授权','先取得合适许可，再决定数据读取和公开展示方式。'],web:['原站网页 / 原文文档','保留可点击入口；未确认原始馈送时，不强行嵌入整个网站或绕过访问限制。']};
const FIELD_ZH={CALL_SIGN:'呼号',VESSEL_NAME:'船名',SHIP_TYPE:'船舶类型',FLAG:'船旗',AGENT_NAME:'代理名称',ETA_TIME:'预计到达时间',LAST_PORT:'上一港口',PASI:'PASI（原字段）',CURRENT_LOCATION:'当前报告地点代码',ETD_TIME:'预计离港时间',NEXT_PORT:'下一港口',VESSEL_MAX_DRAFT:'最大吃水（单位见原始说明）',ATA_TIME:'实际抵港时间',BERTH:'泊位代码',ATD_TIME:'实际离港时间',TRIP_NO:'航次号',ARRIVAL_TIME:'抵港时间',IMO_NO:'IMO 编号',TRIP_ID:'航次编号',AGENT_CODE:'代理代码',ENTER_LOCATION:'进入地点代码',EXIT_LOCATION:'离开地点代码',CODE:'地点代码',DESCRIPTION:'地点说明',Date:'日期',Time:'时间',Place:'站点',Station:'站点',year:'年',month:'月',day:'日',hour:'小时',wave_height:'有效波高',wave_direction:'波向（来向）',wave_period:'波周期',wind_wave_height:'风浪波高',wind_wave_direction:'风浪方向（来向）',wind_wave_period:'风浪周期',swell_wave_height:'涌浪波高',swell_wave_direction:'涌浪方向（来向）',swell_wave_period:'涌浪周期',ocean_current_velocity:'海流速度',ocean_current_direction:'海流方向（去向）',sea_surface_temperature:'海面温度',sea_level_height_msl:'海面高度（全球平均海面基准）'};
const TIDE_STATIONS={CCH:'Cheung Chau',CLK:'Chek Lap Kok',CMW:'Chi Ma Wan',KCT:'Kwai Chung',KLW:'Ko Lau Wan',LOP:'Lok On Pai',MWC:'Ma Wan',QUB:'Quarry Bay',SPW:'Shek Pik',TAO:'Tai O',TBT:'Tsim Bei Tsui',TMW:'Tai Miu Wan',TPK:'Tai Po Kau',WAG:'Waglan Island'};
const TIDE_ZH={'Quarry Bay':'鲗鱼涌','Shek Pik':'石壁','Tsim Bei Tsui':'尖鼻咀','Tai Miu Wan':'大庙湾','Tai Po Kau':'大埔滘','Tai O':'大澳','Waglan Island':'横澜岛'};
function liveFeed(id=LIVE.selected){return FEEDS.find(x=>x.id===id)}
function recordKey(f,params=LIVE.params){return f.id==='marine'?`${f.id}:${Number(params.lat)},${Number(params.lon)}`:f.id==='hhot'?`${f.id}:${params.station}:${params.date}`:f.id}
function feedRecord(f){return LIVE.records[recordKey(f)]||{status:'idle'}}
function showValue(v){if(v===null||v===undefined||v===''||/^(N\/?A|---+|null)$/i.test(String(v).trim()))return '—';if(typeof v==='object')return JSON.stringify(v);return String(v)}
function numeric(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function timeDate(value){
 if(value===null||value===undefined||value==='')return null;let v=String(value).trim();
 if(/^\d{12}$/.test(v))v=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8)+'T'+v.slice(8,10)+':'+v.slice(10,12)+':00+08:00';
 else if(/^\d{8}$/.test(v))return null;
 else if(/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(v))v=v.replaceAll('/','-').replace(' ','T')+'+08:00';
 const d=new Date(v);return Number.isNaN(d.getTime())?null:d;
}
function formatTime(value){const d=timeDate(value);if(!d)return value?showValue(value):'未提供 / 未识别';return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d)+' HKT'}
function latestTime(values){const a=values.map(timeDate).filter(Boolean).sort((a,b)=>b-a);return a.length?a[0].toISOString():null}
function timestampFromRow(row){
 const first=String(row[0]??'');if(/^\d{12}$/.test(first))return first;
 const date=row.find(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x)));const time=row.find(x=>/^\d{2}:\d{2}(:\d{2})?$/.test(String(x)));return date&&time?`${date}T${time}+08:00`:null;
}
function humanField(key){return FIELD_ZH[key]||FIELD_ZH[String(key).toUpperCase()]||String(key)}
function scalar(v){if(v&&typeof v==='object'&&!Array.isArray(v)&&'value'in v)return `${showValue(v.value)}${v.unit?' '+v.unit:''}`;if(Array.isArray(v))return v.map(scalar).join('\n');if(v&&typeof v==='object')return Object.entries(v).map(([k,x])=>`${humanField(k)}：${scalar(x)}`).join('\n');return showValue(v)}
function parseCSV(text){
 const data=[];let row=[],cell='',quoted=false;const s=text.replace(/^\uFEFF/,'');
 for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++}else if(!quoted&&cell==='')quoted=true;else if(quoted)quoted=false;else cell+=ch}
 else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\r'||ch==='\n')&&!quoted){if(ch==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))data.push(row);row=[];cell=''}else cell+=ch}
 if(quoted)throw new Error('CSV 引号未闭合，不能安全解析。');if(cell!==''||row.length){row.push(cell);if(row.some(v=>v!==''))data.push(row)}
 if(!data.length)throw new Error('CSV 响应为空。');return data;
}
function fieldsTable(j,title){if(!j||!Array.isArray(j.fields)||!Array.isArray(j.data))throw new Error('响应不是官方文档中的 fields / data 结构。');const columns=j.fields.map(x=>typeof x==='string'?x:x.name||x.field||JSON.stringify(x));if(!columns.length)throw new Error('接口未提供可识别字段。');const rows=j.data.map(r=>Array.isArray(r)?r:columns.map(c=>r[c]));if(rows.some(r=>r.length!==columns.length))throw new Error('响应列数与字段定义不一致。');return {title,columns,rows}}
function objectsTable(title,rows,keys){keys=keys||[...new Set(rows.flatMap(r=>Object.keys(r)))];return {title,columns:keys.map(humanField),keys,rows:rows.map(r=>keys.map(k=>r[k]))}}
function decodeJSON(text){let j;try{j=JSON.parse(text.replace(/^\uFEFF/,''))}catch(_){throw new Error('返回内容不是可解析的 JSON，可能是源站错误页。')}if(j===null||typeof j!=='object')throw new Error('接口没有返回预期对象。');if(j.error||j.errorMessage||j.errorInfo||(j.success===false))throw new Error(scalar(j.reason||j.errorMessage||j.errorInfo||j.error||j));return j}
function parseXMLTable(text,location){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('为安全起见，不解析含 DTD/ENTITY 的 XML。');
 const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('源站响应不是有效 XML。');
 if(doc.documentElement.localName.toLowerCase()==='html')throw new Error('源站返回了网页而不是 XML 数据。');
 const nodes=[...doc.getElementsByTagName('*')];const entries=[];
 for(const node of nodes){const obj={};for(const child of [...node.children]){if(child.children.length===0)obj[child.localName]=child.textContent.trim()}for(const a of [...node.attributes])obj[a.name]=a.value;
 const upper=Object.keys(obj).map(x=>x.toUpperCase());if(location?(upper.includes('CODE')&&upper.includes('DESCRIPTION')):upper.includes('VESSEL_NAME'))entries.push(obj)}
 if(!entries.length)throw new Error('XML 已取得，但尚未识别到预期记录结构；不能据此断言“没有船舶”。可下载原始响应核对。');
 const timeNames=['UPDATE_TIME','UPDATE_DATE','LAST_UPDATE','REPORT_TIME','GENERATION_TIME','GENERATED_AT'];const sourceTimes=nodes.filter(n=>n.children.length===0&&timeNames.includes(n.localName.toUpperCase())).map(n=>n.textContent.trim());
 return {table:objectsTable(location?'地点字典':'船舶报告',entries),time:latestTime(sourceTimes)};
}
function parseFeed(f,text){
 const result={tables:[],sections:[],warnings:[],time:null,timeLabel:'源站更新时间',chartable:false};
 const p=f.parser;
 if(['wind','tide'].includes(p)){
  const data=parseCSV(text),columns=data.shift();if(columns.length<4)throw new Error('CSV 字段与预期不符。');if(data.some(r=>r.length!==columns.length))throw new Error('CSV 行列数量不匹配。');
  if(p==='wind'&&!columns.some(c=>/风|wind/i.test(c)))throw new Error('未识别风资料字段。');if(p==='tide'&&!columns.some(c=>/Height|潮|水位/i.test(c)))throw new Error('未识别潮位字段。');
  result.tables=[{title:'站点观测',columns,rows:data}];result.time=latestTime(data.map(timestampFromRow));result.timeLabel='记录中最新观测时刻';result.chartable=true;
  const ages=data.map(timestampFromRow).map(timeDate).filter(Boolean);if(ages.length){const lo=new Date(Math.min(...ages)),hi=new Date(Math.max(...ages));if(hi-lo>60000)result.warnings.push('不同站点的观测时刻不一致；请以表内每一行的时间为准。')}
  if(p==='tide')result.sections.push({title:'潮位站点说明',text:'Quarry Bay = 鲗鱼涌；Shek Pik = 石壁；Tsim Bei Tsui = 尖鼻咀；Tai Miu Wan = 大庙湾；Tai Po Kau = 大埔滘；Tai O = 大澳；Waglan Island = 横澜岛。'});
  return result;
 }
 if(p==='vtms'||p==='location'){const x=parseXMLTable(text,p==='location');result.tables=[x.table];result.time=x.time;result.sections.push({title:'数据性质',text:p==='location'?'仅地点代码字典，不含船舶位置流。':'船舶日报。ETA/ETD/到离港时间是记录字段，不会被当成这份报告的发布时刻。源站未给出明确更新时间时显示“未提供”。'});return result}
 const j=decodeJSON(text);result.time=j.updateTime||null;
 if(p==='fields'||p==='hhot'){
  const t=fieldsTable(j,p==='hhot'?'逐小时潮高预测':'能见度观测');result.tables=[t];if(p==='fields'){result.time=latestTime(t.rows.map(timestampFromRow));result.timeLabel='记录中最新观测时刻'}else{result.timeLabel='预测发布日期';if(!t.rows.length)result.warnings.push('所选日期没有返回预测记录；当年覆盖尚未核验。')}
  return result;
 }
 if(p==='rhrread'){
  if(!('temperature'in j||'humidity'in j||'rainfall'in j))throw new Error('未识别当前天气报告的观测字段。');
  for(const [key,label]of [['temperature','气温'],['humidity','相对湿度'],['rainfall','降雨'],['lightning','闪电记录'],['uvindex','紫外线']]){
   const v=j[key];if(v&&Array.isArray(v.data)&&v.data.length){result.tables.push(objectsTable(label,v.data));const ts=v.recordTime||[v.startTime,v.endTime].filter(Boolean).join(' — ');if(ts)result.sections.push({title:label+'对应时间',text:String(ts)})}
  }
  for(const [k,label]of [['warningMessage','报告附带警告'],['rainfallReminder','降雨补充'],['tcmessage','热带气旋补充'],['specialWxTips','特别提示']])if(j[k]&&j[k].length)result.sections.push({title:label,text:scalar(j[k])});
  return result;
 }
 if(p==='warnsum'){
  if(Array.isArray(j))throw new Error('警告摘要应为对象，而非数组。');const rows=[];for(const [code,w]of Object.entries(j)){if(typeof w!=='object'||w===null)continue;const action=String(w.actionCode||'');const exp=timeDate(w.expireTime);let interpretation=action==='CANCEL'?'源站标记解除':action==='ISSUE'?'源站标记发布':action==='UPDATE'?'源站标记更新':'请核对原文';if(action!=='CANCEL'&&exp&&exp<new Date())interpretation+='；已超过返回有效期';rows.push({警告代码:code,名称:w.name,动作代码:action,状态解释:interpretation,发布时间:w.issueTime,更新时间:w.updateTime,有效期至:w.expireTime})}
  if(Object.keys(j).length&&!rows.length)throw new Error('警告摘要格式未识别。');result.tables=[objectsTable('警告条目',rows,['警告代码','名称','动作代码','状态解释','发布时间','更新时间','有效期至'])];result.time=latestTime(rows.map(x=>x.更新时间));if(!rows.length)result.sections.push({title:'返回结果',text:'本次接口没有返回警告条目。此状态不是安全出航许可。'});return result;
 }
 if(p==='warningInfo'){
  if(!Array.isArray(j.details)&&Object.keys(j).length)throw new Error('未识别天气警告详情结构。');const items=j.details||[];result.sections=items.map(x=>({title:[x.warningStatementCode,x.subtype].filter(Boolean).join(' · ')||'天气警告',text:scalar(x.contents||x)}));result.time=latestTime(items.map(x=>x.updateTime));if(!items.length)result.sections.push({title:'返回结果',text:'接口没有返回天气警告详情。请同时核对官方警告页面。'});return result;
 }
 if(p==='swt'){
  if(!Array.isArray(j.swt)&&Object.keys(j).length)throw new Error('未识别特别天气提示结构。');const rows=j.swt||[];result.sections=rows.map(x=>({title:formatTime(x.updateTime),text:scalar(x.desc||x)}));result.time=latestTime(rows.map(x=>x.updateTime));if(!rows.length)result.sections.push({title:'返回结果',text:'接口没有返回特别天气提示，不表示全部海上风险已排除。'});return result;
 }
 if(p==='flw'){
  if(!('forecastDesc'in j))throw new Error('未识别地区天气预报结构。');for(const [k,label]of [['generalSituation','天气概况'],['forecastPeriod','预报时段'],['forecastDesc','天气预报'],['outlook','展望'],['tcInfo','热带气旋资料'],['fireDangerWarning','火灾危险警告']])if(j[k])result.sections.push({title:label,text:scalar(j[k])});return result;
 }
 if(p==='fnd'){
  if(!Array.isArray(j.weatherForecast))throw new Error('未识别九天天气预报数组。');if(j.generalSituation)result.sections.push({title:'天气概况',text:scalar(j.generalSituation)});result.tables=[objectsTable('逐日预报',j.weatherForecast)];if(j.seaTemp)result.sections.push({title:'响应附带海温资料（保留观测时间）',text:scalar(j.seaTemp)});return result;
 }
 if(p==='sccw'){
  if(!j.weatherForecast&&!j.generalSituation)throw new Error('未识别华南沿岸海域报告。');for(const [k,label]of [['warnings','警告'],['generalSituation','天气概况'],['tcInfo','热带气旋资料']])if(j[k])result.sections.push({title:label,text:scalar(j[k])});
  if(j.weatherForecast&&Array.isArray(j.weatherForecast.data))result.tables.push(objectsTable(j.weatherForecast.title||'分区海事天气预报',j.weatherForecast.data));
  if(j.weatherReport&&Array.isArray(j.weatherReport.data))result.tables.push(objectsTable(j.weatherReport.title||'沿岸站点天气报告',j.weatherReport.data));
  if(j.weatherOutlook)result.sections.push({title:j.weatherOutlook.title||'天气展望',text:scalar(j.weatherOutlook.info||j.weatherOutlook)});return result;
 }
 if(p==='marine'){
  if(!j.hourly||!Array.isArray(j.hourly.time))throw new Error('未取得海洋模型逐小时时间序列。');const keys=Object.keys(j.hourly).filter(k=>k!=='time'&&Array.isArray(j.hourly[k]));if(!keys.length)throw new Error('响应没有海洋预报变量。');if(keys.some(k=>j.hourly[k].length!==j.hourly.time.length))throw new Error('海洋预报变量长度与时间轴不一致。');
  result.tables=[{title:'逐小时模型预报',keys:['time',...keys],columns:['有效时间（HKT）',...keys.map(k=>`${humanField(k)}${j.hourly_units?.[k]?' / '+j.hourly_units[k]:''}`)],rows:j.hourly.time.map((t,i)=>[t,...keys.map(k=>j.hourly[k][i])])}];
  result.chartable=true;result.units=j.hourly_units||{};result.time=null;result.timeLabel='模型起报时刻';result.sections.push({title:'返回网格与时区',text:`返回网格：${j.latitude}, ${j.longitude}；时区：${j.timezone||'未提供'}；预报有效时间范围：${j.hourly.time[0]||'—'} 至 ${j.hourly.time.at(-1)||'—'}。当前响应未提供模型起报时刻；generationtime_ms 只是接口处理耗时。`});
  result.warnings.push('模型预报不是现场测量；近岸精度有限，不可作为近岸航行或艇前逐浪控制依据。');return result;
 }
 throw new Error('尚无此产品的解析器。');
}
function buildFeedURL(f,params=LIVE.params){
 const u=new URL(f.url);
 if(f.id==='marine'){
  const lat=Number(params.lat),lon=Number(params.lon);if(!String(params.lat).trim()||!String(params.lon).trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<20||lat>24||lon<112||lon>116)throw new Error('请输入香港附近坐标：纬度 20–24，经度 112–116。');
  u.searchParams.set('latitude',String(lat));u.searchParams.set('longitude',String(lon));u.searchParams.set('hourly','wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature,sea_level_height_msl');u.searchParams.set('timezone','Asia/Hong_Kong');u.searchParams.set('forecast_days','3');
 }
 if(f.id==='hhot'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(params.date))throw new Error('请输入完整日期。');const [y,m,d]=params.date.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));if(y<2000||y>2100||dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw new Error('日期无效。');if(!Object.hasOwn(TIDE_STATIONS,params.station))throw new Error('未知潮汐测站代码。');for(const [k,v]of Object.entries({station:params.station,year:y,month:m,day:d,rformat:'json'}))u.searchParams.set(k,String(v));
 }
 return u.toString();
}
async function fetchTimed(url,timeout=16000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{signal:controller.signal,credentials:'omit',cache:'no-store',headers:{Accept:'application/json,text/csv,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.1'}})}finally{clearTimeout(timer)}}
let modePromise=null;
function detectMode(){
 if(modePromise)return modePromise;
 modePromise=(async()=>{if(!/^https?:$/.test(location.protocol)){LIVE.mode='direct';return 'direct'}try{const r=await fetchTimed('/api/health',1200);const j=await r.json();LIVE.mode=r.ok&&j.service==='hk-maritime-hub-v3'?'proxy':'direct'}catch(_){LIVE.mode='direct'}return LIVE.mode})();return modePromise;
}
function transportLabel(){return LIVE.mode==='proxy'?'本地服务 · 同源读取':LIVE.mode==='direct'?'浏览器直连 · 受跨域限制':'正在检查本地服务'}
function statusText(rec){return rec.status==='loading'?'正在读取':rec.status==='error'?(rec.model?'更新失败 / 旧结果':'连接或解析失败'):rec.status==='ok'?(rec.model?.warnings?.length?'已取得 / 见提示':'已取得响应'):'尚未连接'}
async function loadFeed(id=LIVE.selected){
 const f=liveFeed(id);if(!f)return;const params={...LIVE.params},key=recordKey(f,params);const old=LIVE.records[key]||{};if(old.status==='loading')return;
 const rec=LIVE.records[key]={...old,status:'loading',lastAttempt:new Date().toISOString(),error:null};if(state.route==='live'){renderFeedMenu();if(id===LIVE.selected)renderFeedViewer()}
 try{
  const sourceURL=buildFeedURL(f,params);rec.sourceURL=sourceURL;const mode=await detectMode();let response,text,fetchedAt,cacheHit=false;
  if(mode==='proxy'){
   const q=new URLSearchParams();if(f.id==='marine'){q.set('lat',params.lat);q.set('lon',params.lon)}if(f.id==='hhot'){q.set('date',params.date);q.set('station',params.station)}
   response=await fetchTimed('/api/feed/'+encodeURIComponent(f.id)+(q.size?'?'+q.toString():''),20000);let payload;try{payload=await response.json()}catch(_){throw new Error('本地服务返回格式异常。')}
   if(!response.ok||!payload.ok)throw new Error(payload.error||'本地服务请求失败（HTTP '+response.status+'）。');text=payload.text;fetchedAt=payload.fetched_at;cacheHit=!!payload.cache_hit;rec.sourceURL=payload.source_url||sourceURL;
  }else{
   response=await fetchTimed(sourceURL);if(!response.ok)throw new Error('源站 HTTP '+response.status+'。');const len=Number(response.headers.get('Content-Length'));if(len>8*1024*1024)throw new Error('响应超过 8 MB 限额。');text=await response.text();fetchedAt=new Date().toISOString();
  }
  if(typeof text!=='string'||text.length>8*1024*1024)throw new Error('响应过大或类型异常。');rec.raw=text;rec.receivedAt=fetchedAt;const model=parseFeed(f,text);
  Object.assign(rec,{status:'ok',model,modelRaw:text,fetchedAt,cacheHit,params,sourceURL:rec.sourceURL,error:null});
 }catch(err){rec.status='error';rec.error=err?.name==='AbortError'?'请求超时，未获得新数据。':String(err.message||err);if(/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(rec.error))rec.error+=' 可能是跨域、网络或源站拒绝；请使用 ZIP 中的本地服务，不使用公开代理绕过。';}
 if(state.route==='live'){renderFeedMenu();renderLiveSummary();if(recordKey(liveFeed())===key)renderFeedViewer()}
}
function renderLiveSummary(){
 const successful=Object.values(LIVE.records).filter(r=>r.status==='ok').length;
 $('live-summary').innerHTML=`<div class="live-kpi"><strong>17 <small>＋ 2</small></strong><span>最新数据/报告查询 ＋ 条件预测/参考字典</span></div><div class="live-kpi"><strong>${successful}<small>本次会话</small></strong><span>已成功读取的查询结果 · 不代表持续在线</span></div><div class="live-kpi"><strong style="font-size:16px">${esc(transportLabel())}</strong><span>不需要在页面输入密钥 · 来源分别读取</span></div>`;
}
function renderFeedMenu(){
 $('feed-menu-list').innerHTML=FEEDS.filter(f=>LIVE.group==='all'||f.group===LIVE.group).map(f=>{const r=feedRecord(f);return `<button class="feed-button ${LIVE.selected===f.id?'active':''}" data-feed="${f.id}"><b>${esc(f.name)}</b><small><span>${esc(f.source)} · ${esc(f.kind)}</span><span class="feed-state ${esc(r.status)}">${esc(statusText(r))}</span></small></button>`}).join('');
}
function renderLive(){renderLiveSummary();renderFeedMenu();renderFeedViewer();detectMode().then(()=>{if(state.route==='live')renderLiveSummary()});if(feedRecord(liveFeed()).status==='idle')loadFeed()}
function selectFeed(id){if(!liveFeed(id))return;LIVE.selected=id;LIVE.table=0;LIVE.page=1;LIVE.query='';LIVE.metric='';LIVE.group='all';$('feed-filter').value='all';if(state.route!=='live')navigate('live');else{renderFeedMenu();renderFeedViewer();if(feedRecord(liveFeed()).status==='idle')loadFeed()}}
function parameterControls(f){
 if(f.id==='marine')return `<div class="query-params"><label>纬度 / Latitude<input id="live-lat" inputmode="decimal" type="number" step="0.01" min="20" max="24" value="${esc(LIVE.params.lat)}"></label><label>经度 / Longitude<input id="live-lon" inputmode="decimal" type="number" step="0.01" min="112" max="116" value="${esc(LIVE.params.lon)}"></label><p>默认是香港南面海域的示例查询坐标，并非测站。修改坐标后点击“读取 / 刷新”；只查询该点，不与其他来源融合。</p></div>`;
 if(f.id==='hhot')return `<div class="query-params"><label>预测日期<input id="live-date" type="date" value="${esc(LIVE.params.date)}"></label><label>潮汐预测站<select id="live-station">${Object.entries(TIDE_STATIONS).map(([k,v])=>`<option value="${k}" ${k===LIVE.params.station?'selected':''}>${esc(k+' · '+v)}</option>`).join('')}</select></label><p>条件查询：当前年份覆盖尚未通过实际 API 验收；无数据会明确显示，不自动替换成旧年份。</p></div>`;return '';
}
function renderFeedViewer(){
 const f=liveFeed(),r=feedRecord(f);let url;try{url=buildFeedURL(f)}catch(_){url=f.url}
 $('feed-viewer').innerHTML=`<div class="feed-head"><span class="pill ${f.group==='observation'?'green':'amber'}">${esc(f.kind)}</span> <span class="mini-status">${esc(statusText(r))}</span><h2>${esc(f.name)}</h2><p>${esc(f.provider)} · ${esc(f.cadence)}</p><p>${esc(f.note)}</p>${parameterControls(f)}<div class="feed-actions"><button class="btn primary" data-refresh-feed ${r.status==='loading'?'disabled':''}>${r.status==='loading'?'正在读取…':'读取 / 刷新'}</button><a class="btn" href="${esc(f.source_page)}" target="_blank" rel="noopener noreferrer">官方说明 ↗</a><a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">原始接口 ↗</a><label class="auto"><input id="live-auto" type="checkbox" ${LIVE.auto?'checked':''}> 本页自动检查</label></div></div><div id="feed-body" class="feed-body"></div>`;
 renderFeedBody();
}
function renderFeedBody(){
 const f=liveFeed(),r=feedRecord(f),body=$('feed-body');if(!body)return;
 if(!r.model){
  const title=r.status==='loading'?'正在读取官方数据':r.status==='error'?'本次未取得可展示的数据':'尚未连接';
  const msg=r.status==='loading'?'读取完成后显示原始数据时刻、取得时刻、单位与记录内容。不会预填演示数值。':r.error||'点击“读取 / 刷新”查询源站。';
  body.innerHTML=`<div class="live-empty" role="status"><h3>${esc(title)}</h3><p>${esc(msg)}</p>${r.status==='error'?'<button class="btn" data-refresh-feed>重试连接</button>':''}</div><div class="connection-info" style="margin-top:18px">${esc(transportLabel())}。若直接打开 HTML 无法读取 XML/CSV，请解压完整包并运行 <code>python3 server.py</code>，然后访问服务显示的本地地址。后端仅请求预设官方/公开接口，不绕过账号、授权或源站限制。</div>${r.raw?`<details class="raw-data"><summary>已取得但未识别的原始响应</summary><pre>${esc(r.raw.slice(0,100000))}</pre><button class="btn small" data-download-attempt>保存本次原始响应</button></details>`:''}`;return;
 }
 const m=r.model;const t=timeDate(m.time),age=t?(Date.now()-t.getTime())/60000:null;let stale='';if(f.stale_minutes&&age!==null&&age>f.stale_minutes)stale=`记录时间距当前约 ${Math.floor(age)} 分钟，已超过本平台 ${f.stale_minutes} 分钟的提示阈值（此阈值不是官方更新承诺）。`;if(age!==null&&age < -10)stale='返回时间晚于本机时钟；请核对设备时间、响应时间及产品性质。';
 let alerts=[...m.warnings];if(stale)alerts.unshift(stale);if(r.status==='error')alerts.unshift('刷新失败：'+r.error+' 下方保留上次成功的结果，不代表最新。');if(r.status==='loading')alerts.unshift('正在刷新；下方仍为上次成功结果。');
 const total=m.tables.reduce((a,t)=>a+t.rows.length,0);
 body.innerHTML=`${alerts.map(x=>`<div class="risk-warning">${esc(x)}</div>`).join('')}<div class="feed-metadata"><div class="feed-meta"><small>${esc(m.timeLabel)}</small><b>${esc(formatTime(m.time))}</b></div><div class="feed-meta"><small>${r.cacheHit?'后端缓存的首次取得时刻':'成功取得时刻'}（不替代观测/发布时刻）</small><b>${esc(formatTime(r.fetchedAt))}</b></div></div><div class="viewer-controls"><span>${m.tables.length} 张表 · ${total} 条记录${r.cacheHit?' · 服务端缓存命中':''}</span><button class="btn small" data-export-feed>保存本次数据与来源</button></div><div id="live-chart-container"></div>${m.sections.map(s=>`<section class="data-section"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></section>`).join('')}${m.tables.length?`<div class="data-table-tabs">${m.tables.map((t,i)=>`<button class="chip ${LIVE.table===i?'active':''}" data-live-table="${i}">${esc(t.title)} (${t.rows.length})</button>`).join('')}</div><div class="data-table-tools"><div class="searchbox"><input id="live-table-search" placeholder="在当前表中搜索站点、船名、日期或原文…" value="${esc(LIVE.query)}" aria-label="搜索当前数据表"></div><button class="btn small" data-export-table>导出当前完整表 CSV</button></div><div id="live-table-container"></div>`:''}<details class="raw-data"><summary>原始响应 · 保留源站全部字段</summary><pre>${esc(r.modelRaw.slice(0,150000))}${r.modelRaw.length>150000?'\n[页面仅显示前150,000字符；可保存完整响应]':''}</pre></details>${r.status==='error'&&r.raw&&r.raw!==r.modelRaw?`<details class="raw-data"><summary>本次失败响应（与上次成功数据分开）</summary><pre>${esc(r.raw.slice(0,100000))}</pre><button class="btn small" data-download-attempt>保存失败响应</button></details>`:''}<div class="data-foot">来源：<a href="${esc(f.source_page)}" target="_blank" rel="noopener noreferrer">${esc(f.provider)}</a>。${f.id==='marine'?'Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a>；上游模型来源见 <a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener noreferrer">产品文档</a>（包括 Météo-France / Copernicus Marine / ECMWF 等，实际最佳匹配模型以提供方为准）；<a href="https://open-meteo.com/en/licence" target="_blank" rel="noopener noreferrer">CC BY 4.0 及服务使用条件</a>。':'来源归提供机构所有；请遵守其使用条款。'}<br>站内展示经过表格化与中文辅助标注；全部原始字段另行保留。空值不补零，获取时间不是观测时间。仅作研究资料展示，不能作为航行或安全决策系统。</div>`;
 renderLiveTable();renderLiveChart();
}
function currentLiveTable(){const m=feedRecord(liveFeed()).model;if(!m||!m.tables.length)return null;LIVE.table=Math.min(Math.max(0,LIVE.table),m.tables.length-1);return m.tables[LIVE.table]}
function renderLiveTable(){
 const dest=$('live-table-container'),t=currentLiveTable();if(!dest||!t)return;const q=LIVE.query.trim().toLowerCase(),rows=t.rows.filter(r=>!q||r.map(scalar).join(' ').toLowerCase().includes(q));const pages=Math.max(1,Math.ceil(rows.length/20));LIVE.page=Math.max(1,Math.min(LIVE.page,pages));const a=(LIVE.page-1)*20;
 dest.innerHTML=`<div class="live-table-box"><table class="live-table"><thead><tr>${t.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(a,a+20).map(r=>`<tr>${t.columns.map((_,i)=>`<td>${esc(scalar(r[i]))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${t.columns.length}">没有匹配记录；空表不表示整个水域没有目标或没有风险。</td></tr>`}</tbody></table></div><div class="data-paging"><span>${rows.length?'显示 '+(a+1)+'–'+Math.min(a+20,rows.length):'0'} / ${rows.length} 条匹配记录</span><span><button class="btn small" data-live-page="${LIVE.page-1}" ${LIVE.page<=1?'disabled':''}>←</button> ${LIVE.page} / ${pages} <button class="btn small" data-live-page="${LIVE.page+1}" ${LIVE.page>=pages?'disabled':''}>→</button></span></div>`;
}
function lineChart(values,labels,unit){
 const valid=values.map(numeric).filter(x=>x!==null);if(!valid.length)return '<p class="quiet">此变量没有可绘制数值。</p>';let lo=Math.min(...valid),hi=Math.max(...valid);if(lo===hi){lo-=.5;hi+=.5}const pad=(hi-lo)*.12;lo-=pad;hi+=pad;const W=700,H=220,L=61,R=23,T=25,B=37;const x=i=>L+i*(W-L-R)/Math.max(1,values.length-1),y=v=>T+(hi-v)/(hi-lo)*(H-T-B);let d='',last=false;
 values.forEach((v,i)=>{const n=numeric(v);if(n===null){last=false;return}d+=(last?'L':'M')+x(i).toFixed(1)+','+y(n).toFixed(1);last=true});
 const grid=Array.from({length:4},(_,i)=>{const v=lo+(hi-lo)*i/3;return `<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#dde8e6"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" fill="#748d94" font-size="10">${v.toFixed(2)}</text>`}).join('');const ii=[0,Math.floor((values.length-1)/2),values.length-1];
 return `<svg class="live-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="所选变量时间曲线；缺测值不连线"><text x="${L}" y="15" fill="#597a83" font-size="10">${esc(unit||'单位见原始字段')}</text>${grid}<path d="${d}" fill="none" stroke="#087c7d" stroke-width="2"/>${valid.length<3?values.map((v,i)=>numeric(v)===null?'':`<circle cx="${x(i)}" cy="${y(numeric(v))}" r="3" fill="#087c7d"/>`).join(''):''}${ii.map((i,k)=>`<text x="${x(i)}" y="${H-12}" text-anchor="${k===0?'start':k===2?'end':'middle'}" fill="#748d94" font-size="9">${esc(String(labels[i]||'').replace('T',' ').slice(-11))}</text>`).join('')}</svg>`;
}
function renderLiveChart(){
 const box=$('live-chart-container'),f=liveFeed(),m=feedRecord(f).model;if(!box||!m)return;box.innerHTML='';if(!m.chartable||!m.tables.length)return;const t=m.tables[0];
 if(f.id==='marine'){
  const vars=t.keys.slice(1);if(!vars.includes(LIVE.metric))LIVE.metric=vars[0];const i=t.keys.indexOf(LIVE.metric);box.innerHTML=`<div class="chart-wrap"><div class="viewer-controls"><span>逐小时模型预报 · 不是观测</span><select class="chart-select" id="live-metric" aria-label="海洋预报变量">${vars.map(k=>`<option value="${k}" ${LIVE.metric===k?'selected':''}>${esc(humanField(k))}</option>`).join('')}</select></div>${lineChart(t.rows.map(r=>r[i]),t.rows.map(r=>r[0]),m.units[LIVE.metric])}<div class="chart-label">曲线在缺测处断开。方向量属于环形角度，跨 0°/360° 的直线跳变不能解释为急剧变化。</div></div>`;
 }else{
  const idx=f.id==='wind'?3:t.columns.findIndex(c=>/Height|潮位/i.test(c)),stationIdx=f.id==='wind'?1:0;if(idx<0)return;const rows=t.rows.filter(r=>numeric(r[idx])!==null).slice(0,12);if(!rows.length)return;const max=Math.max(...rows.map(r=>Math.abs(numeric(r[idx]))),1);box.innerHTML=`<div class="chart-wrap"><div class="chart-label">${f.id==='wind'?'各站十分钟平均风速（公里/小时）':'各站潮位（米；基准以原站说明为准）'} · 前 ${rows.length} 个有值站点</div><div style="padding:12px 14px;background:#f7faf9;border:1px solid var(--line);border-radius:8px">${rows.map(r=>{const v=numeric(r[idx]);return `<div style="display:flex;align-items:center;gap:8px;margin:7px 0;font-size:10px"><span style="width:115px;flex-shrink:0">${esc(TIDE_ZH[r[stationIdx]]||r[stationIdx])}</span><span style="flex:1;background:#e5efec;height:6px;border-radius:3px"><i style="display:block;width:${Math.abs(v)/max*100}%;height:6px;background:var(--teal);border-radius:3px"></i></span><b style="width:42px;text-align:right;font-weight:600">${esc(v)}</b></div>`}).join('')}</div><div class="chart-label">完整记录见表格。柱长按绝对值显示，正负号保留；站点间不是空间插值。</div></div>`;
 }
}
function renderExternal(){
 const grouped=Object.entries(EXTERNAL_GROUPS).map(([mode,[name,note]])=>{const rows=DATA.catalog.filter(r=>r.integration.mode===mode);return `<section class="ext-section"><h2>${esc(name)} <span class="quiet">${rows.length} 项</span></h2><p>${esc(note)}</p><div class="ext-grid">${rows.map(r=>`<article class="ext-card"><span class="pill">${esc(r.id)} · ${esc(categories[r.category])}</span><h3>${esc(r.name)}</h3><p>${esc(r.integration.reason)}</p><p class="next">后续处理：${esc(r.integration.next)}</p><div class="modal-links"><button class="btn small" data-resource="${r.id}">全部网址与说明</button>${r.integration.feeds.length?`<button class="btn small" data-feed="${r.integration.feeds[0]}">打开条件查询</button>`:''}<a class="btn small" href="${esc(r.urls[0])}" target="_blank" rel="noopener noreferrer">原站查看 ↗</a></div></article>`).join('')}</div></section>`}).join('');$('external-list').innerHTML=grouped;
}
function enhanceResourceCards(){document.querySelectorAll('#resource-grid .resource-card').forEach(card=>{const button=card.querySelector('[data-resource]');if(!button||card.querySelector('.integration-note'))return;const r=DATA.catalog.find(r=>r.id===button.dataset.resource);if(!r)return;const n=document.createElement('div');n.className='integration-note';n.innerHTML=`${esc(r.integration.label)}${r.integration.feeds.length?`<button data-feed="${r.integration.feeds[0]}">站内读取 ${r.integration.feeds.length>1?'('+r.integration.feeds.length+' 个产品)':''} →</button>`:''}`;card.querySelector('.card-bottom').prepend(n)})}
function exportLiveTable(){const t=currentLiveTable();if(!t)return;const safeCell=v=>{let s=scalar(v);if(/^[=+@\-]/.test(s)&&numeric(v)===null)s="'"+s;return '"'+s.replaceAll('"','""')+'"'};saveFile(liveFeed().id+'_table.csv','\ufeff'+[t.columns,...t.rows].map(r=>r.map(safeCell).join(',')).join('\r\n'),'text/csv;charset=utf-8')}
function captureParameters(){if($('live-lat'))LIVE.params.lat=$('live-lat').value;if($('live-lon'))LIVE.params.lon=$('live-lon').value;if($('live-date'))LIVE.params.date=$('live-date').value;if($('live-station'))LIVE.params.station=$('live-station').value}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.feed){selectFeed(b.dataset.feed);return}
 if(b.hasAttribute('data-refresh-feed')){captureParameters();LIVE.page=1;LIVE.query='';loadFeed();return}
 if(b.dataset.liveTable!==undefined){LIVE.table=Number(b.dataset.liveTable);LIVE.page=1;LIVE.query='';renderFeedBody();return}
 if(b.dataset.livePage!==undefined){LIVE.page=Number(b.dataset.livePage);renderLiveTable();return}
 if(b.hasAttribute('data-export-table')){exportLiveTable();return}
 if(b.hasAttribute('data-export-feed')){const f=liveFeed(),r=feedRecord(f);if(!r.model)return;exportJSON(f.id+'_response_with_provenance.json',{product:f.name,type:f.kind,source_page:f.source_page,source_url:r.sourceURL,fetched_at:r.fetchedAt,source_timestamp:r.model.time,source_timestamp_label:r.model.timeLabel,last_request_status:r.status,cache_hit:r.cacheHit,parameters:r.params||{},raw_response:r.modelRaw,note:'取得时刻不替代观测时刻；非航行用途。'});return}
 if(b.hasAttribute('data-download-attempt')){const r=feedRecord(liveFeed());if(r.raw)saveFile(liveFeed().id+'_unparsed_response.txt',r.raw,'text/plain;charset=utf-8')}
});
document.addEventListener('change',e=>{
 if(e.target.id==='feed-filter'){LIVE.group=e.target.value;renderFeedMenu()}
 if(e.target.id==='live-auto')LIVE.auto=e.target.checked;
 if(e.target.id==='live-metric'){LIVE.metric=e.target.value;renderLiveChart()}
});
document.addEventListener('input',e=>{if(e.target.id==='live-table-search'){LIVE.query=e.target.value;LIVE.page=1;renderLiveTable()}});
setInterval(()=>{if(state.route!=='live'||document.hidden||!LIVE.auto)return;const f=liveFeed(),r=feedRecord(f);if(r.status==='loading')return;const last=timeDate(r.lastAttempt);if(!last||(Date.now()-last.getTime())/1000>=f.refresh_seconds)loadFeed()},15000);
// Exposed only for local parser tests. This object never injects test data into the released site.
window.HubDataReaders={parseCSV,parseFeed,buildFeedURL,numeric,showValue,FEEDS};
