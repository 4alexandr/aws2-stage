//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 console
 */

/**
 * @module js/Timeline/uiTimelineOverrides
 */
import timelineManager from 'js/uiGanttManager';

'use strict';
var exports = {};

//Begin - lines to be commented for debug print
var console = {};
console.log = function() {};
//End - lines to be commented for debug print

/**
 * Method for adding the overrides.
 */
export let addOverrides = function() {
    //-------------------------------------------------------------------------------------------------------------
    //Override the implementation so that task dates are not
    //modified by the dhx scheduling logic during a DnD operation.
    timelineManager.getGanttInstance()._tasks_dnd._fix_dnd_scale_time = function( e, i ) {
        //
    };
    //-------------------------------------------------------------------------------------------------------------
    //Override the implementation so that task dates are not
    //modified by the dhx scheduling logic during a DnD operation.
    timelineManager.getGanttInstance()._tasks_dnd._fix_working_times = function( e, i ) {
        //
    };

    //Optimized method for the addTask - Does not call refresh after each task addition.
    //Improves performance in bulk additions like pagination.
    timelineManager.getGanttInstance().addTask = function( e, i, n ) {
        return timelineManager.getGanttInstance().defined( i ) ||
            ( i = this.getParent( e ) || 0 ),
            this.isTaskExists( i ) || ( i = 0 ),
            this.setParent( e, i ),
            e = this._init_task( e ),
            this.callEvent( 'onBeforeTaskAdd', [ e.id, e ] ) === false ? !1 : ( this._pull[ e.id ] = e,
                this._add_branch( e, n ),
                this.callEvent( 'onAfterTaskAdd', [ e.id, e ] ),
                this._adjust_scales(), e.id );
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._render_grid_item = function( e ) {
        if( !timelineManager.getGanttInstance()._is_grid_visible() ) {
            return null;
        }
        if( e.programType !== 'Event' ) {
            console.log( 'Adding to Grid only when programType is not an Event.' );
            var openIconDiv = '<div class=\'gantt_tree_open_icon\'></div>';
            for( var i = this.getGridColumns(), n = [], a = 0; a < i.length; a++ ) {
                var s; var r;
                var o = a === i.length - 1;
                var _ = i[ a ];
                'add' === _.name ? r = '<div class=\'gantt_add\'></div>' : ( r = _.template ? _.template( e ) : e[ _.name ],
                    r instanceof Date && ( r = this.templates.date_grid( r, e ) ), r = '<div class=\'gantt_tree_content\'>' + r + '</div>' + openIconDiv );
                var d = 'gantt_cell' + ( o ? ' gantt_last_cell' : '' );
                    var l = '';
                if( _.tree ) {
                    for( var h = 0; h < e.$level; h++ ) {
                        l += this.templates.grid_indent( e );
                    }
                    var c = this._has_children( e.id );
                    c ? ( l += this.templates.grid_open( e ), l += this.templates.grid_folder( e ) ) : ( l += this.templates.grid_blank( e ), l += this.templates.grid_file( e ) );
                }
                var u = 'width:' + ( _.width - ( o ? 1 : 0 ) ) + 'px;';
                this.defined( _.align ) && ( u += 'text-align:' + _.align + ';' ), s = '<div class=\'' + d + '\' role=\'gridcell\' style=\'' + u + '\'>' + l + r + '</div>',
                    n.push( s );
            }
            var d = e.$index % 2 === 0 ? '' : ' odd';
            if( d += e.$transparent ? ' gantt_transparent' : '', d += e.$dataprocessor_class ? ' ' + e.$dataprocessor_class : '', this.templates.grid_row_class ) {
                var g = this.templates.grid_row_class.call( this, e.start_date, e.end_date, e );
                g && ( d += ' ' + g );
            }
            this.getState().selected_task === e.id && ( d += ' gantt_selected' );
            var f = document.createElement( 'div' );
            return f.className = 'gantt_row' + d,
                f.style.height = this.config.row_height + 'px',
                f.style.lineHeight = timelineManager.getGanttInstance().config.row_height + 'px',
                f.setAttribute( this.config.task_attribute, e.id ),
                f.setAttribute( 'role', 'row' ),
                f.innerHTML = n.join( '' ), f;
        }
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._render_bg_line = function( e ) {
        var i = timelineManager.getGanttInstance()._tasks;
            var n = i.count;
            var a = document.createElement( 'div' );
        var l;
        if( timelineManager.getGanttInstance().config.show_task_cells ) {
            for( var s = 0; n > s; s++ ) {
                var r = i.width[ s ];
                    var o = '';
                if( r > 0 ) {
                    var _ = document.createElement( 'div' );
                    _.style.width = r + 'px',
                        o = 'gantt_task_cell' + ( s === n - 1 ? ' gantt_last_cell' : '' ),
                        l = this.templates.task_cell_class( e, i.trace_x[ s ] ), l && ( o += ' ' + l ),
                        _.className = o,
                        a.appendChild( _ );
                }
            }
            // pragya
            if( e.programType !== 'Event' ) {
                console.log( 'Non Event Found.' );

                var d = e.$index % 2 !== 0;
                    var rowClass = timelineManager.getGanttInstance().templates.task_row_class( e.start_date, e.end_date, e );
                    var h = 'gantt_task_row' + ( d ? ' odd' : '' ) + ( rowClass ? ' ' + rowClass : '' );
                return this.getState().selected_task === e.id && ( h += ' gantt_selected' ),
                    a.className = h,
                    timelineManager.getGanttInstance().config.smart_rendering && ( a.style.position = 'absolute',
                        a.style.top = this.getTaskTop( e.id ) + 'px', a.style.width = '100%' ),
                    a.style.height = timelineManager.getGanttInstance().config.row_height + 'px',
                    a.setAttribute( this.config.task_attribute, e.id ),
                    a;
            }
        }
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._task_default_render = function( e ) {
        if( !this._isAllowedUnscheduledTask( e ) ) {
            var i = this._get_task_pos( e );
            // pragya
            if( e.programType === 'Event' ) {
                i.y += 2;
            }
            var n = this.config;
                var a = this._get_task_height();
                var s = Math.floor( ( this.config.row_height - a ) / 2 );
            this._get_safe_type( e.type ) === n.types.milestone && n.link_line_width > 1 && ( s += 1 );
            var r = document.createElement( 'div' );
                var o = timelineManager.getGanttInstance()._get_task_width( e );
                var _ = this._get_safe_type( e.type );
            r.setAttribute( this.config.task_attribute, e.id ), n.show_progress && _ !== this.config.types.milestone && this._render_task_progress( e, r, o );
            //Add to the gantt only when programType is Event.
            if( e.programType === 'Event' ) {
                var d = timelineManager.getGanttInstance()._render_task_content( e, o );
                e.textColor && ( d.style.color = e.textColor ), r.appendChild( d );
                var taskline = this._combine_item_class( 'gantt_task_line', this.templates.task_class( e.start_date, e.end_date, e ), e.id );
                ( e.color || e.progressColor || e.textColor ) && ( taskline += ' gantt_task_inline_color' ),
                r.className = taskline;
                var h = [ 'left:' + i.x + 'px', 'top:' + ( s + i.y ) + 'px', 'height:' + a + 'px', 'line-height:' + a + 'px', 'width:' + o + 'px' ];
                e.color && h.push( 'background-color:' + e.color ), e.textColor && h.push( 'color:' + e.textColor ), r.style.cssText = h.join( ';' );
                var c = this._render_leftside_content( e );
                return c && r.appendChild( c ),
                    c = this._render_rightside_content( e ),
                    c && r.appendChild( c ),
                    this._is_readonly( e ) ||
                    ( n.drag_resize &&
                        !this._is_flex_task( e ) && _ !== this.config.types.milestone &&
                        timelineManager.getGanttInstance()._render_pair( r, 'gantt_task_drag', e, function( t ) {
                            var e = document.createElement( 'div' );
                            return e.className = t, e;
                        } ), n.drag_links && this.config.show_links && timelineManager.getGanttInstance()._render_pair( r, 'gantt_link_control', e, function( t ) {
                            var e = document.createElement( 'div' );
                            e.className = t, e.style.cssText = [ 'height:' + a + 'px', 'line-height:' + a + 'px' ].join( ';' );
                            var i = document.createElement( 'div' );
                            return i.className = 'gantt_link_point', e.appendChild( i ), e;
                        } ) ), r;
            }
        }
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._get_task_coord = function( t, e, i ) {
        //ignore this error for "e" and "i" should not be assigned in eclipse.
        e = e !== false, i = i || 0;
        var n = this._get_safe_type( t.type ) === this.config.types.milestone;
            var a = null;
        a = e || n ? t.start_date || this._default_task_date( t ) : t.end_date || this.calculateEndDate( this._default_task_date( t ) );
        var s = this.posFromDate( a );
            var r = this.getTaskTopWithLevel( t.id, t );
        return n && ( e ? s -= i : s += i ), {
            x: s,
            y: r
        };
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._build_pull = function( t ) {
        for( var e = null, i = [], n = 0, a = t.length; a > n; ++n ) {
            e = t[ n ];
            // Pragya
            if( typeof e.programType !== typeof undefined ) {
                console.log( 'found programType' );
                if( e.programType === 1 || e.programType === 0 ) //Program, Project, SubProject Detected
                {
                    //Program, Project and Subproject do not have dates.
                    var startDateObject = new Date();
                    e.start_date = startDateObject;
                    e.end_date = e.start_date;
                }
                this._load_task( e );
                i.push( e );
            }
        }
        // console.log(JSON.stringify(i));
        return i;
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._add_branch = function( t, e ) {
        var i = this.getParent( t );
        this.hasChild( i ) || ( this._branches[ i ] = [] );
        for( var n = this.getChildren( i ), a = !1, s = 0, r = n.length; r > s; s++ ) {
            if( n[ s ] === t.id ) {
                a = !0;
                break;
            }
        }
        a || ( Number( e ) === e ? n.splice( e, 0, t.id ) : n.push( t.id ) ), this._sync_parent( t );
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().getTaskTopWithLevel = function( t, element ) {
        if( element.programType !== 'Event' ) {
            return this.getTaskTop( t );
        }

        return this._y_from_ind( this.getGlobalTaskIndexWithLevel( t, element ) );
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().getGlobalTaskIndexWithLevel = function( t, p ) {
        if( p.programType === 'Event' ) {
            var parentId = p.parent;
            return timelineManager.getGanttInstance()._planOrderSearch[ parentId ];
        }
        this.assert( t, 'Invalid argument' );
        return -1;
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._sync_order_item = function( e, i ) {
        e.id !== timelineManager.getGanttInstance().config.root_id && ( timelineManager.getGanttInstance()._order_full.push( e.id ),
            !i && timelineManager.getGanttInstance()._filter_task( e.id, e ) &&
            timelineManager.getGanttInstance().callEvent( 'onBeforeTaskDisplay', [ e.id, e ] ) &&
            ( timelineManager.getGanttInstance()._order.push( e.id ),
                timelineManager.getGanttInstance()._order_search[ e.id ] = timelineManager.getGanttInstance()._order.length - 1 ) );
        if( timelineManager.getGanttInstance().isTaskExists( e.id ) ) {
            var element = timelineManager.getGanttInstance().getTask( e.id );
            if( element.programType !== 'Event' && timelineManager.getGanttInstance().isTaskVisible( e.id ) ) {
                timelineManager.getGanttInstance()._planOrder.push( e.id );
                timelineManager.getGanttInstance()._planOrderSearch[ e.id ] = timelineManager.getGanttInstance()._planOrder.length - 1;
            }
        }
        var n = timelineManager.getGanttInstance().getChildren( e.id );
        if( n ) {
            for( var a = 0; a < n.length; a++ ) {
                var element = timelineManager.getGanttInstance()._pull[ n[ a ] ];
                var showElement = e.$open;
                if( !showElement && element.programType === 'Event' ) {
                    //If any Program/Project is collapsed, then its events are made visible.
                    showElement = true;
                }
                timelineManager.getGanttInstance()._sync_order_item( element, i || !showElement );
            }
        }
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._sync_order = function( t ) {
        timelineManager.getGanttInstance()._order = [],
            timelineManager.getGanttInstance()._order_full = [],
            timelineManager.getGanttInstance()._planOrder = [],
            timelineManager.getGanttInstance()._order_search = {},
            timelineManager.getGanttInstance()._planOrderSearch = {},
            timelineManager.getGanttInstance()._sync_order_item( {
                parent: timelineManager.getGanttInstance().config.root_id,
                $open: !0,
                $ignore: !0,
                id: timelineManager.getGanttInstance().config.root_id
            } ),
            t || ( timelineManager.getGanttInstance()._scroll_resize(),
                timelineManager.getGanttInstance()._set_sizes() );
    };

    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance()._scroll_sizes = function() {
        var t = timelineManager.getGanttInstance()._get_grid_width();
            var e = Math.max( timelineManager.getGanttInstance()._x - t, 0 );
            var i = Math.max( timelineManager.getGanttInstance()._y - timelineManager.getGanttInstance().config.scale_height, 0 );
            var n = timelineManager.getGanttInstance().config.scroll_size + 1;
            var a = timelineManager.getGanttInstance()._get_resize_options();
            var s = timelineManager.getGanttInstance().config.row_height *
            ( typeof undefined === typeof timelineManager.getGanttInstance()._planOrder ? timelineManager.getGanttInstance()._order.length : timelineManager.getGanttInstance()._planOrder.length );
            var r = timelineManager.getGanttInstance()._scroll_ver = a.y ? !1 : s > i;
            var o = Math.max( timelineManager.getGanttInstance()._tasks.full_width - ( r ? 0 : n ), 0 );
            var _ = timelineManager.getGanttInstance()._scroll_hor = a.x ? !1 : o > e;
            var l = {
                x: !1,
                y: !1,
                scroll_size: n,
                x_inner: o + t + n + 2,
                y_inner: s
            };
        return _ && ( l.x = Math.max( timelineManager.getGanttInstance()._x - ( r ? n : 2 ), 0 ) ),
            r && ( l.y = Math.max( timelineManager.getGanttInstance()._y - ( _ ? n : 0 ) - timelineManager.getGanttInstance().config.scale_height, 0 ) ), l;
    };
};

export default exports = {
    addOverrides
};
