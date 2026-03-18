import * as app from 'app';

import awHttpService from 'js/awHttpService';
import transformSchedule from 'js/transformSchedule';

var exports = {};


export let printGantMethod = async function(ctx) {
  console.log('!!!printGantMethod', {ctx});
  window.anPrintGantMethod = {ctx, awHttpService, transformSchedule}

  let schedule = {};
  if (ctx.pselected && ctx.pselected.type === 'Schedule') {
    schedule = ctx.pselected;
  }
  if (ctx.selected && ctx.selected.type === 'Schedule') {
    schedule = ctx.selected;
  }
  if (!schedule.uid) {
    throw new Error('schedule not found');
  }

  const request = {
    body: {
      loadScheduleInfo: {
        schedule: {uid: schedule.uid,type: schedule.type}
      }
    },
    header:{"state": {}}
  };

  const url = '/tc/JsonRestServices/ProjectManagementAw-2018-12-ScheduleManagementAw/loadSchedule2';

  const response = await awHttpService.instance.post(url, request);

  //console.log('!!!response', response);
  const transformed = transformSchedule.transformSchedule({
    data: response.data,
    uid: schedule.uid,
    url: window.location.href.replace(/\?.*/g, '')+'?uid='+schedule.uid,
  })
  //console.log('!!!transformed', transformed);
  window.transformedSchedule = transformed

  const pdf = await fetch('http://tc12rezerv:8081/api/render', {
    method: 'post',
    body: JSON.stringify(transformed),
    headers: {'Content-Type': 'application/json'}
  })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download='schedule.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    })

};

export default exports = {
  printGantMethod
};

app.factory( 'printGantService', () => exports );
