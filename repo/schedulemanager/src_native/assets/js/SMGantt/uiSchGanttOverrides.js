//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/SMGantt/uiSchGanttOverrides
 */
import ganttManager from 'js/uiGanttManager';
import appCtx from 'js/appCtxService';
import dateTimeSvc from 'js/dateTimeService';

var exports = {};

/**
 * Method for adding the overrides.
 *
 */

export let addOverrides = function( dataSource ) {
    //Override the implementation so that task dates are not
    //modified by the dhx scheduling logic during a DnD operation.
    ganttManager.getGanttInstance()._tasks_dnd._fix_dnd_scale_time = function( e, i ) {
        //
    };
    //Override the implementation so that task dates are not
    //modified by the dhx scheduling logic during a DnD operation.
    ganttManager.getGanttInstance()._tasks_dnd._fix_working_times = function( e, i ) {
        //
    };
    //Overrides
    ganttManager.getGanttInstance().isCriticalTask = function( task ) {
        return dataSource.isCriticalTask( task.id );
    };
    ganttManager.getGanttInstance().isCriticalLink = function( link ) {
        return dataSource.isLinkCritical( link.id );
    };
    ganttManager.getGanttInstance()._tasks_dnd.on_mouse_down = function( e, i ) {
        ganttManager.getGanttInstance().config.awShowTooltip = 0; //This will disable the task tooltip when the link drag is enabled.
        if( 2 !== e.button ) {
            var n = ganttManager.getGanttInstance().locate( e );
            var a = null;
            if( ganttManager.getGanttInstance().isTaskExists( n ) && ( a = ganttManager.getGanttInstance().getTask( n ) ),
                !ganttManager.getGanttInstance()._is_readonly( a ) && !ganttManager.getGanttInstance()._tasks_dnd.drag.mode ) {
                ganttManager.getGanttInstance()._tasks_dnd.clear_drag_state(),
                    i = i || e.target || e.srcElement;
                var s = ganttManager.getGanttInstance()._getClassName( i );
                if( !s || !ganttManager.getGanttInstance()._tasks_dnd._get_drag_mode( s ) ) {
                    return i.parentNode ? ganttManager.getGanttInstance()._tasks_dnd.on_mouse_down( e, i.parentNode ) : void 0;
                }
                var r = ganttManager.getGanttInstance()._tasks_dnd._get_drag_mode( s );
                if( r ) {
                    if( r.mode && r.mode !== ganttManager.getGanttInstance().config.drag_mode.ignore && ganttManager.getGanttInstance().config[ 'drag_' + r.mode ] ) {
                        if( n = ganttManager.getGanttInstance().locate( i ), a = ganttManager.getGanttInstance().copy( ganttManager.getGanttInstance().getTask( n ) || {} ),
                            ganttManager.getGanttInstance()._is_readonly( a ) ) {
                            return ganttManager.getGanttInstance()._tasks_dnd.clear_drag_state(), !1;
                        }
                        if( ganttManager.getGanttInstance()._is_flex_task( a ) && r.mode !== ganttManager.getGanttInstance().config.drag_mode.progress ) {
                            return void ganttManager.getGanttInstance()._tasks_dnd.clear_drag_state();
                        }
                        r.id = n;
                        var o = ganttManager.getGanttInstance()._get_mouse_pos( e );
                        r.start_x = o.x,
                            r.start_y = o.y,
                            r.obj = a,
                            ganttManager.getGanttInstance()._tasks_dnd.drag.start_drag = r;
                    } else {
                        ganttManager.getGanttInstance()._tasks_dnd.clear_drag_state();
                    }
                } else if( ganttManager.getGanttInstance().checkEvent( 'onMouseDown' ) && ganttManager.getGanttInstance().callEvent( 'onMouseDown', [ s.split( ' ' )[ 0 ] ] ) && i.parentNode ) {
                    return ganttManager.getGanttInstance()._tasks_dnd.on_mouse_down( e, i.parentNode );
                }
            }
        }
    };
    ganttManager.getGanttInstance()._tasks_dnd.on_mouse_up = function( e ) {
        ganttManager.getGanttInstance().config.awShowTooltip = 1; //This will enable the task tooltip when the link drag is finished.
        var i = ganttManager.getGanttInstance()._tasks_dnd.drag;
        if( i.mode && i.id ) {
            var n = ganttManager.getGanttInstance().getTask( i.id );
            if( ganttManager.getGanttInstance().config.work_time && ganttManager.getGanttInstance().config.correct_work_time && ganttManager.getGanttInstance()._fix_working_times( n, i ),
                ganttManager.getGanttInstance()._tasks_dnd._fix_dnd_scale_time( n, i ),
                ganttManager.getGanttInstance()._init_task_timing( n ),
                ganttManager.getGanttInstance()._tasks_dnd._fireEvent( 'before_finish', i.mode, [ i.id, i.mode, ganttManager.getGanttInstance().copy( i.obj ), e ] ) ) {
                var a = i.id;
                ganttManager.getGanttInstance()._init_task_timing( n ),
                    ganttManager.getGanttInstance()._tasks_dnd.clear_drag_state(),
                    ganttManager.getGanttInstance().updateTask( n.id ),
                    ganttManager.getGanttInstance()._tasks_dnd._fireEvent( 'after_finish', i.mode, [ a, i.mode, e ] );
            } else {
                i.obj._dhx_changed = !1,
                    ganttManager.getGanttInstance().mixin( n, i.obj, !0 ),
                    ganttManager.getGanttInstance().updateTask( n.id );
            }
        }
        ganttManager.getGanttInstance()._tasks_dnd.clear_drag_state();
    };
    //Optimized method for the addTask - Does not call refresh after each task addition.
    //Improves performance in bulk additions like pagination.
    ganttManager.getGanttInstance().addTask = function( e, i, n ) {
        return ganttManager.getGanttInstance().defined( i ) ||
            ( i = this.getParent( e ) || 0 ),
            this.isTaskExists( i ) || ( i = 0 ),
            this.setParent( e, i ),
            e = this._init_task( e ),
            this.callEvent( 'onBeforeTaskAdd', [ e.id, e ] ) === false ? !1 : ( this._pull[ e.id ] = e,
                this._add_branch( e, n ),
                this.callEvent( 'onAfterTaskAdd', [ e.id, e ] ),
                this._adjust_scales(), e.id );
    };

    ganttManager.getGanttInstance().addTaskLayer( function draw_planned( task ) {
        var baselineDates = dataSource.getBaselineTaskDates( task.id );

        if( !baselineDates ) {
            return false;
        }

        var baselineStartDate = ganttManager.getGanttInstance().date.parseDate( baselineDates.startDate, 'xml_date' );
        var baselineEndDate = ganttManager.getGanttInstance().date.parseDate( baselineDates.endDate, 'xml_date' );

        var sizes = ganttManager.getGanttInstance().getTaskPosition( task, baselineStartDate, baselineEndDate );
        var baselineEl = document.createElement( 'div' );

        if( baselineDates.startDate === baselineDates.endDate ) { // Milestone
            baselineEl.className = 'gantt_base_milestone';
            baselineEl.style.left = sizes.left - 5 + 'px';
            baselineEl.style.top = sizes.top + ganttManager.getGanttInstance().config.task_height + 5 + 'px';
        } else {
            baselineEl.className = 'gantt_baseline';
            baselineEl.style.left = sizes.left + 'px';
            baselineEl.style.width = sizes.width - 0.5 + 'px';
            baselineEl.style.top = sizes.top + ganttManager.getGanttInstance().config.task_height + 14 + 'px';
        }

        var baselineParentEl = document.createElement( 'div' );
        baselineParentEl.classList.add( 'baseline_properties' );
        //To show only dates for Baseline
        if( appCtx.ctx.showGanttTaskProperties === true ) {
            var baselineElLeftChild = document.createElement( 'div' );
            baselineElLeftChild.className = 'baseline_child_properties';
            baselineElLeftChild.innerHTML = dateTimeSvc.formatDate( baselineStartDate );
            baselineElLeftChild.style.left = sizes.left - 71 + 'px';
            if( task.taskType === 1 ) { //Milestone
                baselineElLeftChild.style.left = sizes.left - 76 + 'px';
            }
            baselineElLeftChild.style.top = sizes.top + ganttManager.getGanttInstance().config.task_height + 2 + 'px';
            //Add start date for left side
            baselineParentEl.appendChild( baselineElLeftChild );
            //Add baseline
            baselineParentEl.appendChild( baselineEl );

            var baselineElRightChild = document.createElement( 'div' );
            baselineElRightChild.className = 'baseline_child_properties';
            baselineElRightChild.innerHTML = dateTimeSvc.formatDate( baselineEndDate );
            baselineElRightChild.style.left = sizes.left + sizes.width + 15 + 'px';
            if( task.taskType === 1 ) { //Milestone
                baselineElRightChild.style.left = sizes.left + sizes.width + 23 + 'px';
            }
            baselineElRightChild.style.top = sizes.top + ganttManager.getGanttInstance().config.task_height + 2 + 'px';
            //Add end date for right side
            baselineParentEl.appendChild( baselineElRightChild );
        } else { // If task properties are not viewed , add baseline element to show baseline on Gantt
            baselineParentEl.appendChild( baselineEl );
        }

        return baselineParentEl;
    } );

    ganttManager.getGanttInstance()._render_pair = function( e, clsName, task, a ) {
        var state = ganttManager.getGanttInstance().getState();
        if( clsName === 'gantt_task_drag' ) {
            //For Schedule Summary task, Summary task and Proxy task don't add both left and right drag bands.
            if( task.taskType !== 2 && task.taskType !== 5 && task.taskType !== 6 ) {
                var isFinishDateSch = dataSource.isFinishDateSchedule( task.id );
                if( isFinishDateSch ) {
                    Number( task.start_date ) >= Number( state.min_date ) && e.appendChild( a( clsName + ' task_left' ) );
                } else {
                    Number( task.start_date ) >= Number( state.min_date ) && e.appendChild( a( clsName + ' task_right' ) );
                }
            }
        } else {
            Number( task.end_date ) <= Number( state.max_date ) && e.appendChild( a( clsName + ' task_right' ) ),
                Number( task.start_date ) >= Number( state.min_date ) && e.appendChild( a( clsName + ' task_left' ) );
        }
    };
    ganttManager.getGanttInstance()._get_visible_milestone_width = function() {
        //set it to hardcoded 20 as width for milestone is specified in smGanttCustomStyles.css
        var e = dataSource.hasBaseline() ? 10 : 20;
        return Math.sqrt( 2 * e * e );
    };

    ganttManager.getGanttInstance()._render_grid_item = function( e ) {
        if( !ganttManager.getGanttInstance()._is_grid_visible() ) { return null; }
        for( var i, n = this.getGridColumns(), a = [], s = 0; s < n.length; s++ ) {
            var r;
            var o;
            var _;
            var l = s === n.length - 1;
            var d = n[ s ];
            if( 'add' === d.name ) {
                var h = this._waiAria.gridAddButtonAttrString( d );
                o = '<div ' + h + ' class=\'gantt_add\'></div>';
                    _ = '';
            } else {
                o = d.template ? d.template( e ) : e[ d.name ];
                    o instanceof Date && ( o = this.templates.date_grid( o, e ) );
                    _ = o;
                    o = '<div class=\'gantt_tree_content\'>' + o + '</div>';
            }
            var whatIfClassName = '';
            if( d.name === 'text' ) {
                if( e.whatIfMode === 1 && e.type !== 'scheduleSummary' ) {
                    whatIfClassName = ' task_added_in_whatif_mode';
                }
                if( e.hasWhatIfData && e.type !== 'scheduleSummary' ) {
                    whatIfClassName = ' modified_in_whatif_mode';
                }
            }
            var c = 'gantt_cell' + whatIfClassName + ( l ? ' gantt_last_cell' : '' );
            var u = '';
            if( d.tree ) {
                for( var g = 0; g < e.$level; g++ ) { u += this.templates.grid_indent( e ); }
                i = this._has_children( e.id ),
                    i ? ( u += this.templates.grid_open( e ),
                        u += this.templates.grid_folder( e ) ) : ( u += this.templates.grid_blank( e ),
                        u += this.templates.grid_file( e ) );
            }
            var f = 'width:' + ( d.width - ( l ? 1 : 0 ) ) + 'px;';
            this.defined( d.align ) && ( f += 'text-align:' + d.align + ';' );
            var h = this._waiAria.gridCellAttrString( d, _ );
            r = '<div class=\'' + c + '\' style=\'' + f + '\' ' + h + '>' + u + o + '</div>',
                a.push( r );
        }
        var c = ganttManager.getGanttInstance().getGlobalTaskIndex( e.id ) % 2 === 0 ? '' : ' odd';
        if( c += e.$transparent ? ' gantt_transparent' : '',
            c += e.$dataprocessor_class ? ' ' + e.$dataprocessor_class : '',
            this.templates.grid_row_class ) {
            var p = this.templates.grid_row_class.call( this, e.start_date, e.end_date, e );
            p && ( c += ' ' + p );
        }
        this.getState().selected_task === e.id && ( c += ' gantt_selected' );
        var v = document.createElement( 'div' );
        return v.className = 'gantt_row' + c,
            v.style.height = this.config.row_height + 'px',
            v.style.lineHeight = ganttManager.getGanttInstance().config.row_height + 'px',
            v.setAttribute( this.config.task_attribute, e.id ),
            this._waiAria.taskRowAttr( e, v ),
            v.innerHTML = a.join( '' ),
            v;
    };
    //The following code should be uncommented for custom drawing of dependency lines different from provide by DHX
    //oldGetPoints variable is never read is due to known bug in eclipse
    //https://bugs.eclipse.org/bugs/show_bug.cgi?id=351470
    //can be ignored.
    // var oldGetPoints = ganttManager.getGanttInstance()._path_builder.get_points;
    // ganttManager.getGanttInstance()._path_builder.get_points = function (link) {
    // if (link.type === ganttManager.getGanttInstance().config.links.start_to_start ||
    // link.type === ganttManager.getGanttInstance().config.links.finish_to_finish) {
    // return oldGetPoints.apply(this, arguments);
    // }

    // var pt = this.get_endpoint(link);
    // var xy = ganttManager.getGanttInstance().config;

    // var dy = pt.e_y - pt.y;
    // var dx = pt.e_x - pt.x;

    // var dir = ganttManager.getGanttInstance()._drawer.dirs;

    // this.clear();
    // this.point({
    // x: pt.x,
    // y: pt.y
    // });

    // var shiftX = 2 * xy.link_arrow_size;//just random size for first line
    // var forward;

    // switch (link.type) {
    // case ganttManager.getGanttInstance().config.links.finish_to_start:
    // forward = (pt.e_x > (pt.x + 2 * shiftX));
    // if (forward) {
    // dx -= shiftX;
    // this.point_to(dir.right, dx);
    // this.point_to(dir.down, dy);
    // this.point_to(dir.right, shiftX);
    // } else {
    // this.point_to(dir.right, shiftX);
    // dx -= 2 * shiftX;
    // var sign = dy > 0 ? 1 : -1;
    // this.point_to(dir.down, sign * (xy.row_height / 2));
    // this.point_to(dir.right, dx);
    // this.point_to(dir.down, sign * (Math.abs(dy) - (xy.row_height / 2)));
    // this.point_to(dir.right, shiftX);
    // }
    // break;
    // case ganttManager.getGanttInstance().config.links.start_to_finish:
    // forward = (pt.e_x > (pt.x - 2 * shiftX));

    // if (!forward) {
    // dx += shiftX;
    // this.point_to(dir.right, dx);
    // this.point_to(dir.down, dy);
    // this.point_to(dir.left, shiftX);
    // } else {
    // this.point_to(dir.left, shiftX);
    // dx += 2 * shiftX;
    // var sign1 = dy > 0 ? 1 : -1;
    // this.point_to(dir.down, sign1 * (xy.row_height / 2));
    // this.point_to(dir.right, dx);
    // this.point_to(dir.down, sign1 * (Math.abs(dy) - (xy.row_height / 2)));
    // this.point_to(dir.left, shiftX);
    // }
    // }

    // return this.path;
    // };
};

export default exports = {
    addOverrides
};
