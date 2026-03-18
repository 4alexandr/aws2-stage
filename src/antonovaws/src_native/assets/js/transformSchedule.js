import * as app from 'app';

var exports = {};

/**
 * transform.js — IE6-compatible (ES3) vanilla JS
 *
 * Usage (browser):
 *   var input = ... // parsed JSON (as object)
 *   var output = transform(input);
 *
 * Notes:
 * - If a field is missing in in.json => null (per requirement)
 * - Items are emitted in the order of ServiceData.plain (per requirement)
 * - Only objects with className/type "ScheduleTask" are included in timelines
 * - Dates are normalized to "YYYY-MM-DD" when possible (from dbValues like 2025-11-03T08:00:00+02:00)
 */
function isArray(x) {
  // IE6-safe array check
  return x && typeof x.length === "number" && typeof x !== "string";
}

function mapDependencyType(n) {
  if (n === 0) return "FS";
  if (n === 1) return "FF";
  if (n === 2) return "SS";
  return null;
}

function buildPredecessorsMap(model) {
  // { taskId: [ { id, dependencyType } ] }
  var map = {};
  if (!model) return map;

  var oid, obj, props, primary, secondary, dt, dtNum;

  for (oid in model) {
    if (model.hasOwnProperty && !model.hasOwnProperty(oid)) continue;

    obj = model[oid];
    if (!obj) continue;

    if (obj.type !== "TaskDependency" && obj.className !== "TaskDependency") continue;

    props = obj.props || {};
    primary = readPropValue(props.primary_object, false);
    secondary = readPropValue(props.secondary_object, false);
    dt = readPropValue(props.dependency_type, false);
    dtNum = (dt === null) ? null : parseInt(dt, 10);

    if (primary !== null && secondary !== null) {
      if (!map[primary]) map[primary] = [];
      map[primary].push([
        secondary,
        mapDependencyType(dtNum),
        0,
      ]);

      /*if (!map[secondary]) map[secondary] = [];
      map[secondary].push([
          primary,
          mapDependencyType(dtNum),
          0,
      ]);*/
      /*
      map[secondary].push({
          id: primary,
          dependencyType: mapDependencyType(dtNum),
          slack: 0,
      });
      */
    }
  }

  return map;
}

function firstValue(arr) {
  if (!arr || !arr.length) return null;
  return arr[0];
}

function readPropValue(propObj, preferUi) {
  // propObj example: { dbValues: ["..."], uiValues: ["..."], isNulls:[true] }
  if (!propObj) return null;

  // explicit nulls
  if (propObj.isNulls && propObj.isNulls.length && propObj.isNulls[0] === true) {
    return null;
  }

  var v = null;
  if (preferUi && propObj.uiValues) v = firstValue(propObj.uiValues);
  if (v === null && propObj.dbValues) v = firstValue(propObj.dbValues);
  if (v === null && !preferUi && propObj.uiValues) v = firstValue(propObj.uiValues);

  // normalize empty strings to null (common in AWC payloads)
  if (v === "") return null;
  return v;
}

function toDateOnly(isoLike) {
  // expects something like "2025-11-03T08:00:00+02:00" or "...Z"
  if (isoLike === null || isoLike === undefined) return null;
  if (typeof isoLike !== "string") return null;

  // If already "YYYY-MM-DD" return as-is
  if (isoLike.length === 10 && isoLike.charAt(4) === "-" && isoLike.charAt(7) === "-") {
    return isoLike;
  }

  // If it contains ISO timestamp, take first 10 chars when it looks like YYYY-MM-DD...
  if (isoLike.length >= 10 && isoLike.charAt(4) === "-" && isoLike.charAt(7) === "-") {
    return isoLike.substring(0, 10);
  }

  return isoLike; // fallback (unknown format)
}

function pickAssignee(props) {
  var ra = props ? props.ResourceAssignment : null;

  if (ra.uiValues) {
    return ra.uiValues.join(', ');
  }

  return null;
}

function transform(req) {
  // output format (from out-format.ts):
  // {
  //   "timelines": {
  //     id, name, description?, assignee?, start, finish, efforts?, progress?, parent?
  //   }[]
  // }
  var out = {
    timelines: [],
    render: {},
    revision: [],
    header: {
      title: "",
      subtitle: "",
      grid: "monthly",
      links: {Page: req.url},
    },
  };

  if (!req.data || !req.data.ServiceData) return out;

  var sd = req.data.ServiceData;
  var predecessorsMap = buildPredecessorsMap(sd.modelObjects)

  var i, obj, props, item;

  for (i = 0; i < req.data.scheduleTasksInfo.length; i++) {
    obj = sd.modelObjects[req.data.scheduleTasksInfo[i].scheduleTask.uid];

    if (!obj) continue;

    // Only tasks
    if (obj.className !== "ScheduleTask" && obj.type !== "ScheduleTask") continue;

    props = obj.props || {};

    if (i === 0) {
      out.header.title = readPropValue(props.object_name, true);
      out.header.subtitle = readPropValue(props.object_desc, true);
      continue
    }

    item = {
      id: out.timelines.length+1,
      oid: obj.objectID || null,
      name: readPropValue(props.object_name, true),
      description: readPropValue(props.object_desc, true),
      assignee: pickAssignee(props),
      start: toDateOnly(readPropValue(props.start_date, false)),
      finish: toDateOnly(readPropValue(props.finish_date, false)),
      efforts: (function () {
        // format.ts: efforts?: number;//priority
        var v = readPropValue(props.priority, false);
        if (v === null) return null;
        // try parse number
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
      })(),
      progress: readPropValue(props.complete_percent, true),
      parent: (function () {
        var p = readPropValue(props.fnd0ParentTask, false);
        if (p === null) return null;

        var parent = out.timelines.find(function (fItem) {
          return fItem.oid === p;
        })

        return parent || null;
      })(),
      children: [],
      predecessors: [],
    };

    if (item.parent) {
      item.id = item.parent.id + '.' + (item.parent.children.length + 1);
      item.parent.children.push(item.id)
      item.parent = item.parent.id;
    }

    // If name is still null, fall back to object_string (some payloads use that)
    if (item.name === null) item.name = readPropValue(props.object_string, true);

    if (item.oid !== null && predecessorsMap[item.oid] && predecessorsMap[item.oid].length) {
      item.predecessors = predecessorsMap[item.oid];
    } else {
      item.predecessors = [];
    }

    // Per requirement: if something is missing => null (already done).
    // Optional fields: keep them present (with null) to make consumer logic simpler.
    out.timelines.push(item);
  }

  for(i = 0; i < out.timelines.length; i++) {
    item = out.timelines[i];

    for (var pi = 0; pi < item.predecessors.length; pi++) {
      var predId = item.predecessors[pi][0];
      var predecessor = out.timelines.find(function (fItem) {
        return fItem.oid === predId;
      })
      item.predecessors[pi][0] = predecessor ? predecessor.id : 0;
    }
  }

  out.timelines = [out.timelines];

  return out;
}

export let transformSchedule = function(indata) {
  return transform(indata)
};

export default exports = {
  transformSchedule
};

app.factory( 'transformSchedule', () => exports );
