/* eslint-disable max-lines */
//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 */
/**
 * @module js/reqTraceabilityMatrixService
 */
import app from 'app';
import iconService from 'js/iconService';
import commandsMapService from 'js/commandsMapService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import 'd3';
import eventBus from 'js/eventBus';
//
// d3 this needs to remain here.
//
var d3 = require( 'd3' );
'use strict';
const miscCollapseIcon = iconService.getIcon( 'miscCollapse' );
const miscCollapsedTreeIcon = iconService.getIcon( 'miscCollapsedTree' );
const miscExpandedTreeIcon = iconService.getIcon( 'miscExpandedTree' );
const indicatorArrowNorthEastIcon = iconService.getIcon( 'indicatorArrowNorthEast' );
const indicatorArrowSouthWestIcon = iconService.getIcon( 'indicatorArrowSouthWest' );
const indicatorArrowBidirectionalIcon = iconService.getIcon( 'indicatorArrowBidirectional' );
const unsortedIcon = iconService.getIcon( 'miscUnSorted' );
const sortedDescendingIcon = iconService.getIcon( 'miscSortedDescending' );
const cell_height = 30;
const cell_width = 60;
const collapse_width = 16;
const sort_control_width = 12;
const type_icon_width = 16;
const extra_width = 14;
const FORTY_FIVE_DEGREE_ANGLE = 0.78; 
var exports = {};
var matrix_container;
var main_svg;
var matrix = [];
var parentOfTarget;
var parentOfSource;
var network_data;
var titleRowColumn;
var row_nodes;
var col_nodes;
var showColor;
var screen_width;
var screen_height;
var global_network_data;
var titleRowColumn;
var matrix = [];
var selectedCell;
var nodeCompareFunction;
var i18n;
var doit;
var screen_width;
var screen_height;
var selectionEventData = {
    colUid: [],
    rowUid: [],
    operationType: null
};
var lastSelectedPosX = null;
var lastSelectedPosY = null;
var operationType = null; 
var totalSelectedCells;
var main_svg;
var matrix_container;
var matrix_container_width;
var matrix_container_height;
var max_row_width = 200;
var max_row_height = 10;
var max_col_height = 10;
var max_col_width = 200;
var row_labels_origin_x = 0;
var row_labels_origin_y = 0;
var col_labels_origin_x = 0;
var col_labels_origin_y = 0;
var max_row_text = 23;
var max_row_title_text = 22;
var max_col_text = 24;
var active_col_page = 1;
var active_row_page = 1;
var typeIconMap = {};
var treeMode = null;
var scrollX = 0;
var scrollY = 0;
var itemsPerPage = 0;
var currentRowPage = 0;
var currentColPage = 0;
var numberOfColPages = 0;
var numberOfRowPages = 0;
var displayRowFrom = 0;
var displayColFrom = 0;
var displayLimitOfRow = 4;
var displayLimitOfCol = 4;
var colPagingArray = [];
var rowPagingArray = [];
/**
 * Get chevron Icon element
 * @param {String} iconName //
 * @return{Object} - svg element
 */
export let getIcon = function( iconName ) {
    return iconService.getIcon( iconName );
};
/**
 * depending on the view there can be more than one aw-commandBar-horizontal if this is the case
 * we are interested in the last one which is the matrix toolbar.
 * also, different view types such as favorites or matrix will have different height for now
 * the number of command bars seems to be a good way to determine the current state.
 * and, this will get called onWindowResize event to ensure matrix uses all real estate allowed.
 */
export let set_visualization_size = function( ) {
    var commandBarWidth = 0;
    var matrixContainerWidth = 0;
    var commandBars = document.getElementsByClassName("aw-commandBar-horizontal");
    if(commandBars.length > 0) {
        commandBarWidth = document.getElementsByClassName("aw-commandBar-horizontal")[commandBars.length - 1];
        matrixContainerWidth = commandBarWidth.offsetWidth;
    }else {
        matrixContainerWidth = 1000;        
    }
    var navigationBarHeight = document.getElementsByClassName("global-navigation-toolbar")[0];
    var matrixContainerHeight = 0;
    if(commandBars.length > 1) {
        matrixContainerHeight = navigationBarHeight.offsetHeight - 177 - 75;
    } else {
        matrixContainerHeight = navigationBarHeight.offsetHeight - 177;
    }
    d3.select( '#matrix_container' )
        .style( 'width',  matrixContainerWidth + "px" )
        .style( 'height', matrixContainerHeight + "px" )
        .style( 'overflow', 'auto' ); 
};
/**
 * refreshMatrix - this is the entry point to trace link matrix rendering loop.
 *
 * @param {Object} eventData 
 */
export let refreshMatrix = function( eventData ) {
    var eventDataString = JSON.stringify( eventData );
    d3.select( '#main_svg' ).remove();
    matrix_container = d3.select( '#matrix_container' );
    main_svg = matrix_container.append("svg")
                        .attr( 'id', 'main_svg' )
                        .attr( 'class', 'aw-relationshipmatrix-mainSvg' )
                        .attr( 'overflow', 'auto' );
    d3.select( '#parent_col_header' ).style( 'display', 'none' );
    if( eventData )
    {
        if( eventData.matrixMode ) {
            treeMode = eventData.matrixMode;
        } else {
            treeMode = false;
        }
        if( eventData.targetParentObjectInfo && eventData.targetParentObjectInfo.displayName ) {
            parentOfTarget = eventData.targetParentObjectInfo;
        } else {
            parentOfTarget = '';
        }
        if( eventData.srcParentObjectInfo && eventData.srcParentObjectInfo.displayName ) {
            parentOfSource = eventData.srcParentObjectInfo;
        } else {
            parentOfSource = '';
        }
        if ( eventData.pageInfo ) {
            active_row_page = eventData.pageInfo.rowPageToNavigate;
            active_col_page = eventData.pageInfo.colPageToNavigate;
        }
        if ( eventData.networkData ) {
            network_data = eventData.networkData;
        }
        if ( eventData.titleRowColumn ) {
            titleRowColumn = eventData.titleRowColumn;
        }
        if ( eventData.showHeatmap ) {
            network_data.showColor = eventData.showHeatmap;
        } else {
           network_data.showColor = false; 
        }
        if ( eventData.showTracelinkDirection ) {
            network_data.showTracelinkDirection = eventData.showTracelinkDirection;
        } else {
           network_data.showTracelinkDirection = false; 
        }
    }
    var title = d3.select( '#col_header_title' )
                .text( titleRowColumn.col_title );
    d3.select( '.col-title' ).style( 'display', 'block' );
    make_d3_clustergram( network_data );
    paginationHandle( eventData );
};
/**
 * make_d3_clustergram - Ideally all d3 code should pass throug here.
 */
export let make_d3_clustergram = function( network_data ) {
    d3.selection.prototype.appendHTML = function( value ) {
        return this.select( function() {
            return this.appendChild( document.importNode( new DOMParser().parseFromString( value, 'text/html' ).body.childNodes[ 0 ], true ) );
        } );
    };
    // special tweak to remove the second vertical scroll bar.
    d3.select( '.aw-layout-summaryContent' )
    .style( 'overflow', 'hidden' );
    max_row_height = 0;
    max_col_height = 0;
    row_labels_origin_x = 0;
    row_labels_origin_y = 0;
    col_labels_origin_x = 0;
    col_labels_origin_y = 0;
    // initialize clustergram variables
    col_nodes = network_data.col_nodes;
    row_nodes = network_data.row_nodes;
    showColor = network_data.showColor;
    i18n = network_data.i18n;
    nodeCompareFunction = network_data.nodeCompareFunction;
    // initialize matrix
    matrix = [];
    row_nodes.forEach( function( tmp, i ) {
        matrix[ i ] = d3.range( col_nodes.length ).map( function( j ) {
            return {
                pos_x: j,
                pos_y: i,
                value: 0,
                group: 0
            };
        } );
    } );
    // Add information to the matrix
    network_data.links.forEach( function( link ) {
        // transfer link information to the new adj matrix
        if( network_data.col_nodes.length > link.target && network_data.row_nodes.length > link.source ) {
            matrix[ link.source ][ link.target ].value = link.value;
            // transfer group information to the adj matrix
            matrix[ link.source ][ link.target ].group = 1;
            // transfer color
            matrix[ link.source ][ link.target ].color = link.color;
            matrix[ link.source ][ link.target ].text = link.text;
            matrix[ link.source ][ link.target ].numLinks = link.numLinks;
            matrix[ link.source ][ link.target ].colUid = link.colUid;
            matrix[ link.source ][ link.target ].rowUid = link.rowUid;
        }
    } );
    //////////////////////////////////
    // // // row labels // // // 
    //////////////////////////////////
    main_svg.append( 'g' )
        .attr( 'id', 'row_labels' )
        .attr( 'x', row_labels_origin_x )
        .attr( 'y', row_labels_origin_y );
    var row_label_obj = d3.select( '#row_labels' )
        .selectAll( '.row_label_text' )
        .data( row_nodes )
        .enter()
        .append( 'g' )
        .attr( 'class', 'row_label_text' )
        .attr( 'transform', function( d, i ) {
            return 'translate(' + row_labels_origin_x + ',' +  i * cell_height  + ')';
        } )
        .on( 'mouseover', function() {
            d3.select( this ).select( 'text' ).classed( 'active', true );
        } )
        .on( 'mouseout', function mouseout() {
            d3.select( this ).select( 'text' ).classed( 'active', false );
        } )
        .on( 'dblclick', navigate_click_row );
    var row_label_text_group =  main_svg.select( '#row_labels' )
        .selectAll( '.row_label_text' )
        .append( 'g' )
        .attr( 'id', 'row_text_and_buttons' );
    row_label_text_group
        .append( 'text' )
        .attr( 'x', function( d ) {
            return treeMode ? 36 + getIndent( d ) : 19;
        } )
        .attr( 'y', cell_height - 11 )
        .attr( 'class', 'aw-relationshipmatrix-headerText aw-widgets-propertyNonEditValue' )
        .attr( 'full_name', function( d ) {
            return d.name;
        } )
        .text( function( d ) {
            var maxText = max_row_text - d.level * 2;
            return d.name && d.name.length > maxText ? d.name.substring( 0, maxText - 1 ) + '..' : d.name;
        } )
        .append( 'title' ).text( function( d ) { return d.name; } ); 
    var row_label_items = row_label_obj._groups[0];
    var row_count = row_label_items ? row_label_items.length : 0;
    var max_row_text_width = 0;
    var max_row_chars = 0;
    for( var i = 0; i < row_nodes.length; i++ ) {
        if ( row_nodes[ i ].name.length > max_row_chars ) {
            max_row_chars = row_nodes[ i ].name.length;
        }
    }
    max_row_text_width = max_row_chars * 6 + extra_width + sort_control_width + collapse_width + type_icon_width;
    max_row_height = row_count * cell_height;
    row_label_text_group.insert( 'rect', 'text' )
        .attr( 'class', 'aw-widgets-propertyNonEditRect matrix_header_background' )
        .attr( 'id', 'row-header-label' )
        .attr( 'x', 0 )
        .attr( 'y', 0 )
        .attr( 'width', max_row_width )
        .attr( 'height', cell_height );
    row_label_text_group.append( 'svg' )
        .attr( 'x', max_row_width - sort_control_width - collapse_width )
        .attr( 'class', 'aw-relationshipmatrix-sortControl aw-relationshipmatrix-button' )
        .on( 'click', reorder_click_row )
        .attr( 'y', 9 )
        .attr( 'width', sort_control_width )
        .attr( 'height', sort_control_width )
        .each( add_sortIcon_function );
    row_label_text_group.append( 'svg' )
        .attr( 'x', function( d ) {
            return treeMode ? getIndent( d ) + 6 : max_row_width - collapse_width;
        } )
        .attr( 'y', 7 )
        .attr( 'width', collapse_width )
        .attr( 'height', collapse_width )
        .on( 'click', navigate_click_row )
        .attr( 'class', '.aw-relationshipmatrix-button' )
        .each( add_chevronIcon_function );
    row_label_text_group.each( add_row_indent_lines );
    row_label_text_group.append( 'svg' )
        .attr( 'x', function( d ) {
            return treeMode ? 19 + getIndent( d ) : 2;
        } )
        .attr( 'y', 7 )
        .attr( 'width', type_icon_width )
        .attr( 'height', type_icon_width )
        .attr( 'viewbox', '0 0 48 48' )
        .attr( 'class', '.aw-base-icon' )
        .each( add_typeIcon_function );
    //////////////////////////////////
    // // // col labels // // // 
    //////////////////////////////////
    main_svg.style( 'fill', 'white' ).style( 'stroke', '#969696' ).style( 'stroke-width', '0.7' )
        .append( 'g' )
        .attr( 'id', 'col_labels' )
        .attr( 'x', 0 )
        .attr( 'y', 0 );
    var col_labels_rect = main_svg.select( '#col_labels' )
        .append( 'g' )
        .attr( 'id', 'col_labels_rects' )
        .attr( 'x', 0 )
        .attr( 'y', 0 );
    var col_labels_text_and_buttons = main_svg.select( '#col_labels' )
        .append( 'g' )
        .attr( 'id', 'col_labels_text_and_buttons' )
        .attr( 'x', 0 )
        .attr( 'y', 0 );
    var col_label_rect_obj = main_svg.select( '#col_labels_rects' )
        .selectAll( '.col_rect' )
        .data( col_nodes )
        .enter()
        .append( 'g' )
        .attr( 'class', 'col_rect' )
        .attr( 'transform', function( d, i ) {
            return ' translate(0,' +   i * cell_width   + ')';
        } )
        .on( 'mouseover', function() {
            d3.select( this ).select( 'text' ).classed( 'active', true );
        } )
        .on( 'mouseout', function mouseout() {
            d3.select( this ).select( 'text' ).classed( 'active', false );
        } )
        .on( 'dblclick', navigate_click_col );
    var col_label_obj = main_svg.select( '#col_labels_text_and_buttons' )
        .selectAll( '.col_label' )
        .data( col_nodes )
        .enter()
        .append( 'g' )
        .attr( 'class', 'col_label' )
        .attr( 'transform', function( d, i ) {
            return ' translate(20,' +   i * cell_width   + ') rotate(45)';
        } )
        .on( 'mouseover', function() {
            d3.select( this ).select( 'text' ).classed( 'active', true );
        } )
        .on( 'mouseout', function mouseout() {
            d3.select( this ).select( 'text' ).classed( 'active', false );
        } )
        .on( 'dblclick', navigate_click_col );
    col_label_rect_obj
        .append( 'text' )
        .attr( 'x', 0 )
        .attr( 'y', cell_width )
        .attr( 'dx',  function( d ) {
            return collapse_width + sort_control_width + getIndent( d );
        } )
        .attr( 'dy', -( cell_width / 2 ) )
        .attr( 'class', 'aw-widgets-propertyNonEditValue aw-relationshipmatrix-headerText' )
        .text( function( d ) {
            return d.name && d.name.length > max_col_text  ?   d.name.substring( 0, max_col_text - 1 ) + '..' : d.name;
        } );
        col_label_rect_obj.each( add_col_indent_lines );
    var col_label_items = col_label_rect_obj._groups[0];
    var col_count = col_label_items ? col_label_items.length : 0;
    var max_col_text_width = 0;
    var max_col_chars = 0;
    for( var i = 0; i < col_nodes.length; i++ ) {
        if ( col_nodes[ i ].name.length > max_col_chars ) {
            max_col_chars = col_nodes[ i ].name.length;
        }
    }
    max_col_text_width = max_col_chars * 6 + collapse_width + sort_control_width + type_icon_width + extra_width;
    max_col_text_width *= FORTY_FIVE_DEGREE_ANGLE;
    max_col_height = col_count * cell_width;
    col_label_rect_obj.insert( 'rect', 'text' )
        .attr( 'class', 'aw-widgets-propertyNonEditRect matrix_header_background' )
        .attr( 'id', 'col-header-rect' )
        .attr( 'x', 0 )
        .attr( 'y', 0 )
        .attr( 'width', max_col_width )
        .attr( 'height', cell_width );
    col_label_rect_obj.selectAll( 'text' ).remove();
    col_label_obj.append( 'text' )
        .attr( 'x', 16 )
        .attr( 'y', cell_width )
        .attr( 'dx', function( d ) {
            return collapse_width + sort_control_width + getIndent( d );
        } )
        .attr( 'dy', -( cell_width / 2 ) )
        .attr( 'class', 'aw-widgets-propertyNonEditValue aw-relationshipmatrix-headerText' )
        .attr( 'full_name', function( d ) {
            return d.name;
        } )
        .text( function( d ) {
            var maxCol = max_col_text - d.level;
            return d.name && d.name.length > maxCol ? d.name.substring( 0, maxCol - 1 ) + '..' : d.name;
        } )
        .append( 'title' ).text( function( d ) { return d.name; } );
    col_label_obj.insert( 'svg', 'text' )
        .attr( 'x', sort_control_width + 2 )
        .attr( 'y', sort_control_width + 6 )
        .on( 'click', reorder_click_col )
        .attr( 'width', sort_control_width )
        .attr( 'height', sort_control_width )
        .attr( 'class', 'aw-relationshipmatrix-sortControl aw-relationshipmatrix-button' )
        .each( add_sortIcon_function );
    col_label_obj.insert( 'svg', 'svg' )
        .attr( 'x', function( d ) {
            return d.level ? 12 * d.level : 0;
        } )
        .attr( 'y', cell_width / 2  - extra_width )
        .on( 'click', navigate_click_col )
        .attr( 'width', collapse_width )
        .attr( 'height', collapse_width )
        .attr( 'class', '.aw-relationshipmatrix-button' )
        .each( add_chevronIcon_function );
    col_label_obj.append( 'svg' )
        .attr( 'x', function( d ) {
            return 27 + getIndent( d );
        } )
        .attr( 'y', 15 )
        .attr( 'width', type_icon_width )
        .attr( 'height', type_icon_width )
        .attr( 'viewbox', '0 0 48 48' )
        .attr( 'class', '.aw-base-icon' )
        .each( add_typeIcon_function );
    col_labels_text_and_buttons
        .selectAll( '#chevronIcon' )
        .attr( 'transform', function( d ) {
            return treeMode ? 'rotate(45,8,8)' : 'rotate(180,8,8)';
        } );
    //////////////////////////////////
    // // // resize main_svg dynamically
    //////////////////////////////////
    var main_svg_width = max_row_width + max_col_height;
    var main_svg_height = max_col_width + max_row_height;
    main_svg.attr( 'x', 0 )
        .attr( 'y', 0 )
        .attr( 'width', main_svg_width + max_col_width )
        .attr( 'height', main_svg_height );
    //////////////////////////////////
    // header group
    //////////////////////////////////
    var matrix_header_x = 0;
    var matrix_header_y = 0;
    var dragResizeRows = d3.drag()
        .on( 'drag', function() {
            max_row_width = d3.event.sourceEvent.layerX;
            max_row_width = max_row_width < 100 ? 100 : max_row_width;
            max_row_text = ( max_row_width - ( extra_width + sort_control_width + collapse_width + type_icon_width ) ) / 6;
            max_row_title_text = ( max_row_width - extra_width ) / 8;
            network_data.matrixMode = treeMode;
            refreshMatrix( network_data );
            paginationHandle();
    } );
    var dragResizeCols = d3.drag()
        .on( 'drag', function() {
            max_col_width = d3.event.sourceEvent.layerY; // Event Y coord based on main_svg so needs adjustment
            max_col_width = max_col_width < 100 ? 100 : max_col_width;
            max_col_text = ( max_col_width - 34 - ( extra_width + sort_control_width + collapse_width ) ) / 6;
            max_col_text *= 1.42; // column header at 45 degree angle so text can be longer the colome width
            network_data.matrixMode = treeMode;
            refreshMatrix( network_data );
            paginationHandle();
        } );
    main_svg.append( 'g' )
        .attr( 'id', 'matrix_header' )
        .attr( 'class', 'row_label_header' )
        .append( 'rect' )
        .attr( 'id', 'matrix_header_rect' )
        .attr( 'x', matrix_header_x )
        .attr( 'y', matrix_header_y )
        .attr( 'width', max_row_width )
        .attr( 'height', max_col_width );
    main_svg.select( '.row_label_header' )
        .append( 'line' ).attr( 'x1', max_row_width ).attr( 'y1', 0 ).attr( 'x2', max_row_width ).attr( 'y2', max_col_width )
        .attr( 'class', 'aw-relationshipmatrix-colSizeControl' )
        .on( 'dblclick', function() {
            max_row_text = max_row_chars;
            max_row_width = max_row_text_width;
            refreshMatrix( network_data );
        } )
        .call( dragResizeRows );
    main_svg.select( '.row_label_header' )
        .append( 'line' ).attr( 'x1', 0 ).attr( 'y1', max_col_width ).attr( 'x2', max_row_width ).attr( 'y2', max_col_width )
        .attr( 'class', 'aw-relationshipmatrix-rowSizeControl' )
        .on( 'dblclick', function() {
            max_col_text = max_col_chars;
            max_col_width = max_col_text_width;
            refreshMatrix( network_data );
        } )
        .call( dragResizeCols );
    if( parentOfSource ) {
        main_svg.selectAll( '.row_label_header' )
            .append( 'text' ).attr( 'x', 0 ).attr( 'dx', 5 ).attr( 'y', max_col_width - 70 )
            .attr( 'id', 'parent_row_header' )
            .text( function() {
                return parentOfSource.displayName && parentOfSource.displayName.length > max_row_title_text
                    ? parentOfSource.displayName.substring( 0, max_row_title_text - 2 ) + '...' : parentOfSource.displayName;
            } )
            .attr( 'class', 'aw-relationshipmatrix-link top_left_box_text aw-jswidget-tab aw-base-tabTitleSelected aw-base-tabTitle breadcrumb-item' )
            .on( 'click', rowNavigationUp )
            .append( 'title' ).text( parentOfSource.displayName ); // tooltip
        main_svg.selectAll( '.row_label_header' )
            .append( 'text' ).attr( 'x', 0 ).attr( 'dx', 5 ).attr( 'y', max_col_width - 65 ).attr( 'dy', 15 )
            .attr( 'class', 'aw-relationshipmatrix-link top_left_box_text aw-jswidget-tab aw-base-tabTitleSelected aw-base-tabTitle breadcrumb-item' )
            .text( '>' );
        main_svg.selectAll( '.row_label_header' )
            .append( 'text' ).attr( 'x', 0 ).attr( 'dx', 5 ).attr( 'y', max_col_width - 58 ).attr( 'dy', 30 )
                .attr( 'class', 'top_left_box_text aw-jswidget-tab aw-base-tabTitleSelected aw-base-tabTitle breadcrumb-item active-breadcrumb' )
                .text( function() {
                    return titleRowColumn.row_title && titleRowColumn.row_title.length > max_row_title_text
                        ? titleRowColumn.row_title.substring( 0, max_row_title_text - 2 ) + '...' : titleRowColumn.row_title;
                } )
            .append( 'title' ).text( titleRowColumn.row_title );
        main_svg.selectAll( '.row_label_header' ).append( 'text' ).attr( 'id', 'row_pagination' ).attr( 'x', 0 ).attr( 'y', max_col_width - 43 ).attr( 'dx', 0 ).attr( 'dy', 40 ).text( ' ' );
    } else {
        main_svg.selectAll( '.row_label_header' )
            .append( 'text' ).attr( 'x', 0 ).attr( 'dx', 5 ).attr( 'y', max_col_width - 70 )
            .attr( 'id', 'parent_row_header' )
            .attr( 'class', 'top_left_box_text aw-jswidget-tab aw-base-tabTitleSelected aw-base-tabTitle breadcrumb-item active-breadcrumb' )
            .append( 'tspan' ).attr( 'x', 0 ).attr( 'dx', 5 ).attr( 'y', max_col_width - 70 ).attr( 'dy', 20 )
            .text( function() {
                return titleRowColumn.row_title && titleRowColumn.row_title.length > max_row_title_text
                    ? titleRowColumn.row_title.substring( 0, max_row_title_text - 2 ) + '...' : titleRowColumn.row_title;
            } )
            .append( 'title' ).text( titleRowColumn.row_title );
            main_svg.selectAll( '.row_label_header' ).append( 'text' ).attr( 'id', 'row_pagination' ).attr( 'x', 0 ).attr( 'y', max_col_width - 43 ).attr( 'dx', 0 ).attr( 'dy', 40 ).text( ' ' );
    }
        main_svg.append( 'g' )
            .attr( 'class', 'col_label_header' )
            .append( 'rect' )
            .attr( 'id', 'column_header_rect' )
            .attr( 'x', max_row_width )
            .attr( 'y', matrix_header_y )
            .attr( 'width', max_col_width + max_col_height )
            .attr( 'height', 27 );
    var colTitleWidth;
    if( parentOfTarget ) {
        var colTitle = main_svg.selectAll( '.col_label_header' )
            .append( 'text' ).attr( 'x', max_row_width ).attr( 'dx', 5 ).attr( 'y', 0 ).attr( 'dy', 20 )
            .attr( 'id', 'parent_col_header' )
            .text( function() {
                return parentOfTarget.displayName + ' >';
            } )
            .attr( 'class', 'aw-relationshipmatrix-link aw-jswidget-tab aw-base-tabTitleSelected aw-base-tabTitle breadcrumb-item' )
            .on( 'click', collNavigationUp );
        colTitleWidth = getTitleWidth( colTitle );
        main_svg.select( '#parent_col_header' ).append( 'title' ).text( parentOfTarget.displayName ); // tooltip
            colTitle = d3.selectAll( '.col_label_header' ).append( 'text' )
            .attr( 'x', max_row_width ).attr( 'dx', colTitleWidth + 8 ).attr( 'y', 0 ).attr( 'dy', 20 )
            .attr( 'class', 'top_left_box_text aw-jswidget-tab aw-base-tabTitleSelected aw-base-tabTitle breadcrumb-item active-breadcrumb' )
            .text( function() {
                return titleRowColumn.col_title;
            } );
            colTitleWidth += getTitleWidth( colTitle );
        main_svg.selectAll( '.col_label_header' ).append( 'text' ).attr( 'id', 'col_pagination' ).attr( 'x', max_row_width ).attr( 'dx', colTitleWidth + 30 ).attr( 'y', 0 ).attr( 'dy', 20 ).text( ' ' );
    } else {
        var colTitle = main_svg.selectAll( '.col_label_header' )
            .append( 'text' ).attr( 'x', max_row_width ).attr( 'dx', 5 ).attr( 'y', 0 ).attr( 'dy', 20 )
            .attr( 'id', 'parent_col_header' )
            .attr( 'class', 'top_left_box_text aw-jswidget-tab aw-base-tabTitleSelected aw-base-tabTitle breadcrumb-item active-breadcrumb' )
            .append( 'tspan' ).attr( 'x', max_row_width ).attr( 'dx', 5 ).attr( 'y', 0 ).attr( 'dy', 20 )
            .text( function() {
                return titleRowColumn.col_title;
            } );
            colTitleWidth = getTitleWidth( colTitle );
        main_svg.selectAll( '.col_label_header' ).append( 'text' ).attr( 'id', 'col_pagination' ).attr( 'x', max_row_width ).attr( 'dx', colTitleWidth + 30 ).attr( 'y', 0 ).attr( 'dy', 20 ).text( ' ' );
    }
    if ( max_row_width + colTitleWidth + extra_width > main_svg_width + max_col_width )  {
        main_svg.attr( 'width',  max_row_width + colTitleWidth + extra_width );
        main_svg.select( '#column_header_rect' ).attr( 'width', colTitleWidth + extra_width );
    }
    main_svg.select( '#row_labels' )
        .attr( 'width', max_row_width )
        .attr( 'height', max_row_height )
        .attr( 'transform', 'translate(0,' + max_col_width + ')' );
    col_labels_origin_x = max_row_width;
    col_labels_origin_y = max_col_width;
    var col_transform_origin = String( String( col_labels_origin_x ) + ' ' + col_labels_origin_y );
    main_svg.select( '#col_labels_rects' )
        .attr( 'width', max_col_width )
        .attr( 'height', max_col_height )
        .attr( 'transform', 'skewX(-45) rotate(-90,' + col_labels_origin_x + ',' + col_labels_origin_y + ') translate(' + max_row_width + ',' + max_col_width * 2  + ')' );
    main_svg.select( '#col_labels_text_and_buttons' )
        .attr( 'width', max_col_width )
        .attr( 'height', max_col_height )
        .attr( 'transform', 'rotate(-90,' + col_labels_origin_x + ',' + col_labels_origin_y + ') translate(' + max_row_width + ',' + ( max_col_width + 14 )  + ')' );
    //////////////////////////////////
    // // // generate matrix_cluster
    //////////////////////////////////
    main_svg.append( 'g' )
        .attr( 'id', 'matrix_cluster' ).attr( 'class', 'aw-relationshipmatrix-cluster' );
    // // cluster rows
    var matrix_cluster = d3.select( '#matrix_cluster' );
    matrix_cluster
        .selectAll( '.row' )
        .data( matrix )
        .enter()
        .append( 'g' )
        .attr( 'class', 'row_lines' )
        .attr( 'transform', function( d, i ) {
            return 'translate (  0,' + i * cell_height + ')';
        } )
        .each( row_function )
        .append( 'line' )
        .attr( 'x1', max_row_width )
        .attr( 'y1', max_col_width )
        .attr( 'x2', main_svg_width )
        .attr( 'y2', max_col_width );
    matrix_cluster
        .append( 'line' )
        .attr( 'x1', max_row_width )
        .attr( 'y1', main_svg_height )
        .attr( 'x2', main_svg_width )
        .attr( 'y2', main_svg_height );
    // // cluster columns
    matrix_cluster
        .selectAll( '.col' )
        .data( col_nodes )
        .enter()
        .append( 'g' )
        .attr( 'class', 'vert_lines' )
        .append( 'line' )
        .attr( 'x1', max_row_width )
        .attr( 'y1', max_col_width )
        .attr( 'x2', max_row_width )
        .attr( 'y2', main_svg_height )
        .attr( 'transform', function( d, i ) {
            return 'translate (' + i * cell_width + ',0)';
        } );
    matrix_cluster
        .append( 'line' )
        .attr( 'x1', main_svg_width )
        .attr( 'y1', max_col_width )
        .attr( 'x2', main_svg_width )
        .attr( 'y2', main_svg_height );
        
    //////////////////////////////////
    // // // size of matrix_container for vertical and horizontal scroll bars, and window resize event
    //////////////////////////////////
    set_visualization_size();    
    
    window.addEventListener('resize', function() {
        set_visualization_size(); 
    }, true); 
    //////////////////////////////////
    // // // Print to PDF does not use stylesheets so apply styles to elements needed for printing
    //////////////////////////////////
    d3.selectAll( '#main_svg text' ).style( 'stroke', 'none' ).style( 'fill', '#464646' );
    d3.selectAll( '.aw-relationshipmatrix-link' ).style( 'fill', '#197fa2' );
    d3.selectAll( '.aw-relationshipmatrix-link svg,polyline' ).style( 'stroke', '#28e632' ).style( 'fill', '#28e632' );
    d3.selectAll( '.aw-relationshipmatrix-cell text' ).style( 'text-anchor', 'end' );
    d3.selectAll( '.aw-relationshipmatrix-navControl' ).style( 'stroke', 'none' );
    d3.selectAll( '.inactive' ).style( 'fill', '#969696' );
    showHeatMap( showColor );
    tracelinkDirectionChangeAction( network_data.showTracelinkDirection );
};
/**
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
export let buildFlatTableColumnInfos = function( awColumnSvc ) {
    var columnInfos = [];
    var propName;
    var propDisplayName;
    var isTableCommand;
    var propWidth;
    var numOfColumnsIn = 8;
    for( var colNdx = 0; colNdx < numOfColumnsIn; colNdx++ ) {
        if( colNdx === 0 ) {
            propName = 'object_defining';
            propDisplayName = 'DEFINING';
            isTableCommand = false;
            propWidth = 250;
        } else if( colNdx === 1 ) {
            propName = 'defning_type';
            propDisplayName = 'DEFINING TYPE';
            isTableCommand = false;
            propWidth = 250;
        } else if( colNdx === 2 ) {
            propName = 'object_complying';
            propDisplayName = 'COMPLYING';
            isTableCommand = false;
            propWidth = 200;
        } else if( colNdx === 3 ) {
            propName = 'complying_type';
            propDisplayName = 'COMPLYING TYPE';
            isTableCommand = false;
            propWidth = 250;
        } else if( colNdx === 4 ) {
            propName = 'tracelink_name';
            propDisplayName = 'TRACELINK DIRECTION';
            isTableCommand = false;
            propWidth = 400;
        } else if( colNdx === 5 ) {
            propName = 'tracelink_type';
            propDisplayName = 'TRACELINK TYPE';
            isTableCommand = false;
            propWidth = 300;
        } else if( colNdx === 6 ) {
            propName = 'defining_context_name';
            propDisplayName = 'DEFINING CONTEXT';
            isTableCommand = false;
            propWidth = 250;
        } else if( colNdx === 7 ) {
            propName = 'complying_context_name';
            propDisplayName = 'COMPLYING CONTEXT';
            isTableCommand = false;
            propWidth = 250;
        }
        var columnInfo = awColumnSvc.createColumnInfo();
        /**
         * Set values for common properties
         */
        columnInfo.name = propName;
        columnInfo.displayName = propDisplayName;
        columnInfo.enableFiltering = false;
        columnInfo.isTableCommand = isTableCommand;
        /**
         * Set values for un-common properties
         */
        columnInfo.typeName = 'String';
        columnInfo.enablePinning = false;
        columnInfo.enableSorting = false;
        columnInfo.enableColumnMenu = false;
        columnInfo.enableCellEdit = false;
        columnInfo.width = propWidth;
        columnInfos.push( columnInfo );
    }
    return columnInfos;
};
export let _buildFlatTableRows = function( data, columnInfos, _uwPropertySvc ) {
    var vmRows = [];
    for( var rowNdx = 0; rowNdx < data.tracelinkTableData.length; rowNdx++ ) {
        var rowNumber = rowNdx + 1;
        var vmObject = {
            props: {}
        };
        var dbValues;
        var displayValues;
        var columnData = data.tracelinkTableData[ rowNdx ].data;
        _.forEach( columnInfos, function( columnInfo, columnNdx ) {
            var columnNumber = columnNdx;
            dbValues = [ rowNumber + ':' + columnNumber ];
            displayValues = [ columnData[ columnNumber ] ];
            var vmProp = _uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName,
                columnInfo.typeName, dbValues, displayValues );
            vmProp.propertyDescriptor = {
                displayName: columnInfo.displayName
            };
            vmObject.props[ columnInfo.name ] = vmProp;
        } );
        vmRows.push( vmObject );
    }
    return vmRows;
};
export let tracelinkDeleted = function( elementsInDeleteTracelink, tracelinkIDVsMatrixCell, cellDataMap ) {
    var mapKey = tracelinkIDVsMatrixCell[ elementsInDeleteTracelink.relation ];
    var linkInfo = cellDataMap[ mapKey[ 0 ] ];
    linkInfo = deteleTracelinkFromMap( linkInfo, elementsInDeleteTracelink );
    cellDataMap[ mapKey ] = linkInfo;
    linkInfo = cellDataMap[ mapKey[ 1 ] ];
    linkInfo = deteleTracelinkFromMap( linkInfo, elementsInDeleteTracelink );
    cellDataMap[ mapKey ] = linkInfo;
};
export let setPageInfo = function( data, colPage, rowPage, totalColumnPages, totalRowPages, displayRowFrom, displayColFrom ) {
    if( !data.pageInfo ) {
        exports.resetPageInfo( data );
    }
    if( colPage ) {
        data.pageInfo.colPageToNavigate = colPage;
    }
    if( rowPage ) {
        data.pageInfo.rowPageToNavigate = rowPage;
    }
    if( totalColumnPages ) {
        data.pageInfo.numberOfColPages = totalColumnPages;
    }
    if( totalRowPages ) {
        data.pageInfo.numberOfRowPages = totalRowPages;
    }
    if( displayColFrom ) {
        data.pageInfo.displayColFrom = displayColFrom;
    }
    if( displayRowFrom ) {
        data.pageInfo.displayRowFrom = displayRowFrom;
    }
};
export let resetPageInfo = function( data ) {
    data.pageInfo = {
        colPageToNavigate: 1,
        rowPageToNavigate: 1,
        displayRowFrom: 1,
        displayColFrom: 1
    };
};
/**
 * get Revision Object.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {Object} Revision Object
 */
export let getRevisionObject = function( obj ) {
    var revObject = obj;
    if( commandsMapService.isInstanceOf( 'Awb0Element', obj.modelType ) ) {
        revObject = cdm.getObject( obj.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }
    return revObject;
};
export let deteleTracelinkFromMap = function( linkInfo, elementsInDeleteTracelink ) {
    if( linkInfo ) {
        linkInfo.complyingLinksInfo = linkInfo.complyingLinksInfo.filter( function( element ) {
            return element.tracelink.uid !== elementsInDeleteTracelink.relation;
        } );
        linkInfo.definingLinksInfo = linkInfo.definingLinksInfo.filter( function( element ) {
            return element.tracelink.uid !== elementsInDeleteTracelink.relation;
        } );
        linkInfo.numOfLinksOnChildren = linkInfo.complyingLinksInfo.length + linkInfo.definingLinksInfo.length;
    }
    return linkInfo;
};
/**
 * calculateViewerHeight
 */
export let calculateViewerHeight = function( ) {
};
/**
 * get the bounding box of a svg text element
 * 
 * note: this is used to determine the size of the breadcrumbs in list mode because tree mode does not have them return 0.
 * note: title width expands automatically when user drags handles. 
 * note: return value here to make jasmine test happy
 */
export let getTitleWidth = function( title ) {
    if ( title._groups[0] ) {
        return title._groups[0][0].getBoundingClientRect().width;    
    }
    return 0;
};
/**
 * prefFilter
 */
export let prefFilter = function( pref ) {
    return pref;
};
/**
 * add_sortIcon_function
 */
export let add_sortIcon_function = function( ) {
    d3.select( this ).select( 'svg' ).remove();
    if ( !treeMode ) {
        if( d3.select( this.parentNode ).classed( 'sorted' ) ) {
            d3.select( this ).appendHTML( sortedDescendingIcon );
        } else {
            d3.select( this ).appendHTML( unsortedIcon );
        }
    }
};
/**
 * This will draw the page controls.
 */
export let paginationHandle = function( eventData ) {
    // restore scroll state after refresh
    if ( treeMode && scrollX > 0 || scrollY > 0 ) {
        var mtx = d3.select( '#aw-traceability-matrix-widget' ).node().parentNode;
        mtx.scrollLeft = scrollX;
        mtx.scrollTop = scrollY;
        scrollX = 0;
        scrollY = 0;
    }
    if ( eventData ) {
        if( !eventData.pageInfo ) {
            return;
        }
        itemsPerPage = eventData.networkData.itemsPerPage;
        currentRowPage = eventData.pageInfo.rowPageToNavigate <= 1 ? 1 : eventData.pageInfo.rowPageToNavigate;
        currentColPage = eventData.pageInfo.colPageToNavigate <= 1 ? 1 : eventData.pageInfo.colPageToNavigate;
        numberOfColPages = eventData.pageInfo.numberOfColPages;
        numberOfRowPages = eventData.pageInfo.numberOfRowPages;
        displayRowFrom = eventData.pageInfo.displayRowFrom;
        displayColFrom = eventData.pageInfo.displayColFrom;
        displayLimitOfRow = 4;
        displayLimitOfCol = 4;
    }
    var xpos = 0;
    var ypos = 0;
    var dxpos = 0;
    var dypos = 0;
    //
    //Adding the page controls for columns
    //
    if( !treeMode && numberOfColPages > 1 ) {
        xpos = d3.select( '#col_pagination' ).attr( 'x' );
        ypos = d3.select( '#col_pagination' ).attr( 'y' );
        dxpos = parseInt( d3.select( '#col_pagination' ).attr( 'dx' ) );
        dypos = d3.select( '#col_pagination' ).attr( 'dy' );
        if( currentColPage > 1 && numberOfColPages > displayLimitOfCol){
            d3.select( '.col_label_header' )
            .append( 'text' )
            .attr( 'x', xpos )
            .attr( 'dx', dxpos )
            .attr( 'y', ypos )
            .attr( 'dy', dypos )
            .text( '<< ' )
            .attr( 'class', 'aw-relationshipmatrix-link' )
            .on( 'click', function() {
                previousColPageNavigation();
            } );
            dxpos += 20;
        }
        colPagingArray = [];
        //Determine total number of col pages
        for( var i = 0; i < numberOfColPages; i++ ) {
            colPagingArray.push( i + 1 );
        }
        //Partition cols for view
        for( var i = displayColFrom; i < Math.min( numberOfColPages + 1, displayColFrom + displayLimitOfCol ); i++ ) {
            var link = d3.select( '.col_label_header' )
            .append( 'text' )
            .attr( 'x', xpos )
            .attr( 'dx', dxpos )
            .attr( 'y', ypos )
            .attr( 'dy', dypos )
            .attr( 'id', 'tlpagelink' + i )
            .attr( 'class', 'aw-relationshipmatrix-link' )
            .text( i )
            .on( 'click', function() {
                var header = d3.select( '.col_label_header' );
                header.selectAll( 'text' ).classed( 'aw-relationshipmatrix-activeTlPage', false );
                d3.select( this ).classed( 'aw-relationshipmatrix-activeTlPage', true );
                active_col_page = parseInt( this.innerHTML );
                setCurrent( active_col_page, 'col_nodes' );
            } );
            if( i === active_col_page ) {
                link.classed( 'aw-relationshipmatrix-activeTlPage', true );
            }
            dxpos += 20;
        }
        if( currentColPage < numberOfColPages && numberOfColPages > displayLimitOfCol ){
            d3.select( '.col_label_header' )
            .append( 'text' )
            .attr( 'x', xpos )
            .attr( 'dx', dxpos )
            .attr( 'y', ypos )
            .attr( 'dy', dypos )
            .text( ' >> ' )
            .attr( 'class', 'aw-relationshipmatrix-link' )
            .on( 'click', function() {
                nextColPageNavigation();
            } );
        }
    }
    if( !treeMode && numberOfRowPages > 1 ) {
        xpos = d3.select( '#row_pagination' ).attr( 'x' );
        ypos = d3.select( '#row_pagination' ).attr( 'y' );
        dxpos = parseInt( d3.select( '#row_pagination' ).attr( 'dx' ) + 5 );
        dypos = d3.select( '#row_pagination' ).attr( 'dy' );
        if( currentRowPage > 1 && numberOfRowPages > displayLimitOfRow){
            d3.select( '.row_label_header' )
            .append( 'text' )
            .attr( 'x', xpos )
            .attr( 'dx', dxpos )
            .attr( 'y', ypos )
            .attr( 'dy', dypos )
            .text( '<< ' )
            .attr( 'class', 'aw-relationshipmatrix-link' )
            .on( 'click', function() {
                previousRowPageNavigation();
            } );
            dxpos += 20;
        }
        rowPagingArray = [];
        //Determine total number of row pages
        for( i = 0; i < numberOfRowPages; i++ ) {
            rowPagingArray.push( i + 1 );
        }
        //Partition rows for view
        for( i = displayRowFrom; i < Math.min( numberOfRowPages + 1, displayRowFrom + displayLimitOfRow ); i++ ) {
            var link = d3.select( '.row_label_header' )
            .append( 'text' )
            .attr( 'x', xpos )
            .attr( 'dx', dxpos )
            .attr( 'y', ypos )
            .attr( 'dy', dypos )
            .attr( 'id', 'tlpagelink' + i )
            .attr( 'class', 'aw-relationshipmatrix-link' )
            .text( i )
            .on( 'click', function() {
                var header = d3.select( '.row_label_header' );
                header.selectAll( 'text' ).classed( 'aw-relationshipmatrix-activeTlPage', false );
                d3.select( this ).classed( 'aw-relationshipmatrix-activeTlPage', true );
                active_row_page = parseInt( this.innerHTML );
                setCurrent( active_row_page, 'row_nodes' );
            } );
            if( i === active_row_page ) {
                link.classed( 'aw-relationshipmatrix-activeTlPage', true );
            }
            dxpos += 20;
        }
        if( currentRowPage < numberOfRowPages && numberOfRowPages > displayLimitOfRow ){
            d3.select( '.row_label_header' )
            .append( 'text' )
            .attr( 'x', xpos )
            .attr( 'dx', dxpos )
            .attr( 'y', ypos )
            .attr( 'dy', dypos )
            .text( ' >> ' )
            .attr( 'class', 'aw-relationshipmatrix-link' )
            .on( 'click', function() {
                nextRowPageNavigation();
            } );
        }
    }
};
/**
 * paginationHandle
 */
export let setCurrent = function( pageNum, type ) {
    var eventData = {};
    if( type === 'col_nodes' ) {
        eventData.colPageToNavigate = pageNum <= 0 ? 1 : pageNum;
    } else {
        eventData.rowPageToNavigate = pageNum <= 0 ? 1 : pageNum;
    }
    eventBus.publish( 'requirementTraceability.uiPagination', eventData );
};
/**
 * redirectToNextPrevPage
 */
export let redirectToNextPrevPage = function( pageNum, type ) {
    var eventData = {};
    if( type === 'col_nodes' ) {
        eventData.colPageToNavigate = pageNum <= 0 ? 1 : pageNum;
        eventData.displayColFrom = pageNum <= 0 ? 1 : pageNum;
        active_col_page = pageNum;
    } else {
        eventData.rowPageToNavigate = pageNum <= 0 ? 1 : pageNum;
        eventData.displayRowFrom = pageNum <= 0 ? 1 : pageNum;
        active_row_page = pageNum;
    }
    eventBus.publish( 'requirementTraceability.uiPagination', eventData );
};
/**
 * previousRowPageNavigation
 */
export let previousRowPageNavigation = function( ) {
    if( rowPagingArray.length > 4 && currentRowPage > 4 ) {
        displayRowFrom -= 4;
        redirectToNextPrevPage( displayRowFrom, 'row_nodes' );
    }
};
/**
 * nextRowPageNavigation
 */
export let nextRowPageNavigation = function( ) {
    if( rowPagingArray.length > displayRowFrom + displayLimitOfRow - 1 ) {
        displayRowFrom += 4;
        redirectToNextPrevPage( displayRowFrom, 'row_nodes' );
    }
};
/**
 * previousColPageNavigation
 */
export let previousColPageNavigation = function( ) {
    if( colPagingArray.length > 4 && currentColPage > 4 ) {
        displayColFrom -= 4;
        redirectToNextPrevPage( displayColFrom, 'col_nodes' );
    }
};
/**
 * nextColPageNavigation
 */
export let nextColPageNavigation = function( ) {
    if( colPagingArray.length > displayColFrom + displayLimitOfCol - 1 ) {
        displayColFrom += 4;
        redirectToNextPrevPage( displayColFrom, 'col_nodes' );
    }
};
/**
 * collNavigationUp
 */
export let collNavigationUp = function( ) {
    var eventData = {
        colUid: parentOfTarget.occurrence.uid,
        colPageToNavigate: 1
    };
    eventBus.publish( 'requirementTraceability.navigateUpOrDown', eventData );
};
/**
 * rowNavigationUp
 */
export let rowNavigationUp = function( ) {    
    var eventData = {
        rowUid: parentOfSource.occurrence.uid,
        rowPageToNavigate: 1
    };
    eventBus.publish( 'requirementTraceability.navigateUpOrDown', eventData );
};
/**
 * add_col_indent_lines
 */
export let add_col_indent_lines = function( data ) {
    var cell = d3.select( this );
    if ( treeMode && data.level ) {
        for ( var i = 0; i < data.level; i++ ) {
            cell.append( 'line' ).attr( 'x1', 12 * i + 5 ).attr( 'y1', -30 )
                .attr( 'x2', 12 * i + 5 ).attr( 'y2', 30 ).style( 'stroke-dasharray', 1 ).style( 'stroke-width', 1 );
        }
        if ( data.level > 0 ) {
            cell.append( 'line' ).attr( 'x1', 12 * data.level + 5 ).attr( 'y1', 30 )
                .attr( 'x2', 12 * ( data.level - 1 ) + 5 ).attr( 'y2', 30 ).style( 'stroke-dasharray', 1 ).style( 'stroke-width', 1 );
        }
    }
};
/**
 * add_row_indent_lines
 */
export let add_row_indent_lines = function( data ) {
    var cell = d3.select( this );
    if ( treeMode && data.level ) {
        for ( var i = 0; i < data.level; i++ ) {
            cell.append( 'line' ).attr( 'x1', 12 * i + 8 ).attr( 'y1', 15 )
                .attr( 'x2', 12 * i + 8 ).attr( 'y2', -15 ).style( 'stroke-dasharray', 1 ).style( 'stroke-width', 1 );
        }
        if ( data.level > 0 ) {
            cell.append( 'line' ).attr( 'x1', 12 * data.level + 8 ).attr( 'y1', 15 )
                .attr( 'x2', 12 * ( data.level - 1 ) + 8 ).attr( 'y2', 15 ).style( 'stroke-dasharray', 1 ).style( 'stroke-width', 1 );
        }
    }
};
/**
 * add_chevronIcon_function
 */
export let add_chevronIcon_function = function( data ) {
    if( data.isParent ) {
        var cell = d3.select( this );
        if ( treeMode ) {
            cell.append( 'rect' ).attr( 'class', 'aw-relationshipmatrix-navControl aw-relationshipmatrix-button' )
                .attr(  'x', data.level ? 12 * ( data.level - 1 ) : 0 ).attr( 'y', 0 ).attr( 'height', 12 ).attr( 'width', 12 );
            if ( data.isExpanded ) {
                cell.append( 'g' ).attr( 'id', 'chevronIcon' )
                    .appendHTML( miscExpandedTreeIcon );
            } else {
                cell.append( 'g' ).attr( 'id', 'chevronIcon' )
                    .appendHTML( miscCollapsedTreeIcon );
            }
            cell.append( 'line' ).attr( 'x1', max_row_width ).attr( 'y1', 0 )
                .attr( 'x2', max_row_width ).attr( 'y2', max_col_width );
        } else {
            cell.append( 'rect' ).attr( 'class', 'aw-relationshipmatrix-navControl aw-relationshipmatrix-button' ).attr( 'height', 12 ).attr( 'width', 12 )
                .append( 'title' ).text( i18n.showChildren ); 
            cell.append( 'g' ).attr( 'id', 'chevronIcon' )
                .appendHTML( miscCollapseIcon );
        }
    }
};
/**
 * Adds a few pixels to display child nodes used when tree mode is enabled.
 */
export let getIndent = function( data ) {
    if ( treeMode ) {
        return data.level ? 12 * data.level : -6;
    }
    return 0;
};
/**
 * add_tracelinkIcon_function
 */
export let add_tracelinkIcon_function = function( data ) {
    if( data.text && isNaN( data.text ) ) {
        var cell = d3.select( this );
        cell.attr( 'width', '16px' ).attr( 'height', '16px' );
        if( data.text.indexOf( 'DEFINING' ) !== -1 ) {
            cell.attr( 'class', 'defining traceability_icon aw-relationshipmatrix-link' );
            cell.appendHTML( indicatorArrowSouthWestIcon );
        } else if( data.text.indexOf( 'COMPLYING' ) !== -1 ) {
            cell.attr( 'class', 'complying traceability_icon aw-relationshipmatrix-link' );
            cell.appendHTML( indicatorArrowNorthEastIcon );
        } else if( data.text.indexOf( 'BOTH' ) !== -1 ) {
            cell.attr( 'class', 'bidirectional traceability_icon aw-relationshipmatrix-link' );
            cell.appendHTML( indicatorArrowBidirectionalIcon );
        }
    }
};
/**
 * add_typeIcon_function
 */
export let add_typeIcon_function = function( data ) {
    if( data.type ) {
        if ( !typeIconMap[data.type] ) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open( 'GET', iconService.getTypeIconURL( data.type ), false );
            xmlHttp.send();
            typeIconMap[data.type] = xmlHttp.responseText;
        }
        d3.select( this ).appendHTML( typeIconMap[data.type] );
    }
};
/**
 * draws the checkerboard
 */
export let row_function = function( row_data ) {
    // generate tiles in the current row
    var cell = d3.select( this );
    cell.selectAll( '.cell' )
        .data( row_data )
        .enter()
        .append( 'g' )
        .attr( 'class', 'g-cell' )
        .classed( 'aw-relationshipmatrix-cell', function( d ) { return d.pos_y !== 0 && d.pos_x !== 0; } )
        .classed( 'aw-relationshipmatrix-totalCell', function( d ) { return d.pos_y === 0 || d.pos_x === 0; } )
        .on( 'mouseover', function( p ) {
            highlightSelection( this, p, false );
        } )
        .on( 'mouseout', function mouseout() {
            clearHighlight();
        } );
    cell.selectAll( '.g-cell' )
    .append( 'rect' )
    .attr( 'class', function( d ) {
        return String( 'cell' + ' cell' + d.pos_x ) + d.pos_y;
    } )
    .attr( 'x', function( d ) {
        var calculated_x = d.pos_x * cell_width + max_row_width;
        return calculated_x;
    } )
    .classed( 'inactive', function( d ) { return d.rowUid === d.colUid; } )
        .attr( 'y', function() {
            return max_col_width;
        } )
        .attr( 'width', cell_width )
        .attr( 'height', cell_height )
    .on( 'click', function( d ) {
        handleCellSelection( this, d );
        highlightSelection( this, d, false );
    } );
    cell.selectAll( '.aw-relationshipmatrix-cell .cell' )
    .classed( 'heated', function( d ) { return d.value > 0 && showColor; } )
    .attr( 'opacity', function( d ) {
        return d.value > 0 && showColor ? d.value : 1;
    } )
    .on( 'dblclick', function( d ) {
        if( d.rowUid !== d.colUid ) {
            // Create tracelink
            var eventData = {
                sourceObject: { uid: [ d.rowUid ] },
                destObject: { uid: [ d.colUid ] }
            };
            rememberScroll();
            eventBus.publish( 'Arm0Traceability.OpenCreateTracelinkPanel', eventData );
            highlightSelection( this, d, true );
        }
    } );
    cell.selectAll( '.aw-relationshipmatrix-cell' ).append( 'svg' )
    .attr( 'class', 'traceability_icon aw-relationshipmatrix-link' )
            .attr( 'x', function( d ) {
                return d.pos_x * cell_width + max_row_width + cell_width / 2;
            } )
            .attr( 'y', function() {
                    return max_col_width + 8;
            } )
    .on( 'click', function( d ) {
        handleCellSelection( this, d );
        highlightSelection( this, d, false );
    } ).on( 'mouseover', function( d ) {
        highlightSelection( this, d, false );
    } )
    .each( add_tracelinkIcon_function );
    cell.selectAll( '.g-cell' ).append( 'text' )
    .attr( 'x', function( d ) {
        return d.pos_x * cell_width + max_row_width + 25;
    } )
    .attr( 'y', function() {
        return max_col_width + 20;
    } )
    .text( function( d ) {
        return d.numLinks && d.numLinks > 0 ? d.numLinks : '';
    } )
    .on( 'click', function( d ) {
        handleCellSelection( this, d );
        highlightSelection( this, d, false );
    } )
    .on( 'mouseover', function( d ) {
        highlightSelection( this, d, false );
    } );
    cell.selectAll( '.aw-relationshipmatrix-cell text' ).attr( 'class', 'aw-relationshipmatrix-link' );
};
/**
 * Show trace links for the selected cell
 * @param {object} element The selected cell element
 * @param {object} data Link data for cell
 */
export let handleCellSelection = function( element, data ) {
    var isMultipleSelection = false;
    var clear = d3.select( element.parentNode ).select( 'rect' ).attr( 'id' ) === 'clicked_cell';
    //Check if selection is multiple. If multiple check if the selection is row wise or col wise
    if ( window.event.ctrlKey ) {
        if ( lastSelectedPosX === null && lastSelectedPosY === null ) {
            isMultipleSelection = false;
        } else if ( operationType === null ) {
            if ( lastSelectedPosX === data.pos_x ) {
                operationType = 'colWise';
                isMultipleSelection = true;
            } else if( lastSelectedPosY === data.pos_y ) {
                operationType = 'rowWise';
                isMultipleSelection = true;
            }
        } else {
            if (  operationType === 'rowWise' && lastSelectedPosY === data.pos_y  ||  operationType === 'colWise' && lastSelectedPosX === data.pos_x  ) {
                isMultipleSelection = true;
            }else {
                isMultipleSelection = false;
                operationType = null;
            }
        }
    }
    if ( !isMultipleSelection ) {
        //If single cell is selected deselect all other previously selected cells and add current selection in selectionEventData
        d3.selectAll( '#clicked_cell' ).attr( 'id', '' ).classed( 'selected-cell', false );
            if( !clear ) {
                totalSelectedCells = 0;
                selectionEventData.colUid = [ data.colUid ];
                selectionEventData.rowUid = [ data.rowUid ];
                lastSelectedPosX = data.pos_x;
                lastSelectedPosY = data.pos_y;
                d3.select( element.parentNode ).select( 'rect' ).attr( 'id', 'clicked_cell' ).classed( 'selected-cell', true );
            } else {
                selectionEventData.colUid = [];
                selectionEventData.rowUid = [];
            }
    } else{
        //If multiple cells are selected push data in selectionEventData and highlight all selected cells
        if( !clear ) {
            lastSelectedPosX = data.pos_x;
            lastSelectedPosY = data.pos_y;
            totalSelectedCells++;
            if ( operationType === 'rowWise' ) {
                selectionEventData.colUid.push( data.colUid );
                selectionEventData.rowUid[0] =  data.rowUid;
            } else {
                selectionEventData.colUid[0] = data.colUid;
                selectionEventData.rowUid.push( data.rowUid );
            }
            d3.select( element.parentNode ).select( 'rect' ).attr( 'id', 'clicked_cell' ).classed( 'selected-cell', true );
        } else {
            totalSelectedCells--;
            if ( operationType === 'rowWise' ) {
                for ( var i = 0; i < selectionEventData.colUid.length; i++ ) {
                    if( selectionEventData.colUid[i] === data.colUid ) {
                        selectionEventData.colUid.splice( i, 1 );
                        break;
                    }
                }
            } else {
                for ( var i = 0; i < selectionEventData.rowUid.length; i++ ) {
                    if( selectionEventData.rowUid[i] === data.rowUid ) {
                        selectionEventData.rowUid.splice( i, 1 );
                        break;
                    }
                }
            }
            d3.select( element.parentNode ).select( 'rect' ).attr( 'id', '' ).classed( 'selected-cell', false );
        }
    }
    selectionEventData.operationType = operationType;
    selectionEventData.isMultipleSelection = isMultipleSelection;
    eventBus.publish( 'Arm0Traceability.showTracelinksPopup', selectionEventData );
};
/**
 * Highlight the row and column of the selected cell
 *
 * @param {object} cell The selected cell
 * @param {object} cellData Link info for the selected cell
 * @param {boolean} update Set cell as the new clicked_cell
 */
export let highlightSelection = function( cell, cellData, update ) {
    // Highlight rows and columns of selected cell.
    d3.selectAll( '.cell' ).classed( 'highlight', function( d ) {
        return d.pos_x === cellData.pos_x || d.pos_y === cellData.pos_y;
    } );
    d3.selectAll( '#row-header-label' ).classed( 'highlight', function( d ) {
        return d.uid === cellData.rowUid;
    } );
    d3.selectAll( '#col-header-rect' ).classed( 'highlight', function( d ) {
        return d.uid === cellData.colUid;
    } );
    //TODO TRACK THIS UPDATE flag
    if ( update ) {
        d3.select( '#clicked_cell' ).attr( 'id', '' ).classed( 'selected-cell', false );
        d3.select( cell ).attr( 'id', 'clicked_cell' ).classed( 'selected-cell', true );
    }
};
/**
 * clear highlighting the row and column of the selected cell
 */
export let clearHighlight = function( ) {
    d3.selectAll( '.highlight' ).classed( 'highlight', false );
    d3.select( '#clicked_cell' ).classed( 'selected-cell', true );
};
/**
  * Update matrix when heatmap mode is toggled (link count shown with color intensity)
  * @param {boolean} showColor true if heatmap mode toggled on
 */
export let showHeatMap = function( showColor ) {
    main_svg.selectAll( '.cell' ).classed( 'heated', function( d ) {
        return  d.value > 0 && showColor;
    } )
    .attr( 'opacity', 1 );
    main_svg.selectAll( '.heated' ).attr( 'opacity', function( d ) {
        return d.value;
    } );
    // hide cell content in heatmap mode
    main_svg.selectAll( '.g-cell' ).selectAll( 'text,.traceability_icon' ).style( 'opacity', function() {
        return showColor ? 0 : 1;
    } );
};
/**
 * show tl arrows
 * @param {boolean} if true show arrows if false don't show.
 */
export let tracelinkDirectionChangeAction = function( showTracelinkDirection ) {
    d3.selectAll( '.g-cell' ).selectAll( '.traceability_icon' ).style( 'opacity', function() {
            if(showTracelinkDirection === "false" || showTracelinkDirection === false) {
                return 0;
            } else if ( showTracelinkDirection === "true" || showTracelinkDirection === true ) {
                return 1;
            }
    } );
};
/**
 * navigate_click_row
 */
export let navigate_click_row = function( d ) {
    rememberScroll();
    // highlight current
    d3.select( this.parentNode ).select( 'text' )
        .attr( 'id', 'clicked_row' );
    if ( d.isExpanded ) {
        var eventData = { rowUid: d.uid };
        eventBus.publish( 'Arm0TraceabilityMatrix.collapseNode', eventData );
    } else if( d.isParent ) {
        var rowName = d3.select( this.parentNode ).select( 'text' ).text();
        var rowUid = d.uid;
        var navEventData = { rowName: rowName, rowUid: rowUid, rowPageToNavigate: 1 };
        //this event triggers isNavRequired
        eventBus.publish( 'requirementTraceability.navigateUpOrDown', navEventData );
    }
    var event = { colUid: [ -1 ], rowUid: [ -1 ] };
};
/**
 * navigate_click_col
 */
export let navigate_click_col = function( d ) {
    rememberScroll();
    d3.select( '#clicked_col' ).attr( 'id', '' );
    // highlight current
    d3.select( this.parentNode ).select( 'text' )
        .attr( 'id', 'clicked_col' );
    if ( d.isExpanded ) {
        var eventData = { colUid: d.uid };
        eventBus.publish( 'Arm0TraceabilityMatrix.collapseNode', eventData );
    } else if ( d.isParent ) {
        var colUid = d.uid;
        // Fire an event
        var navEventData = { colUid: colUid, colPageToNavigate: 1 };
        eventBus.publish( 'requirementTraceability.navigateUpOrDown', navEventData );
    }
    var eventData = { colUid: [ -1 ], rowUid: [ -1 ] };
    eventBus.publish( 'Arm0Traceability.showTracelinksPopup', eventData );
};
/**
 * remember scroll state other because it gets lost after refresh
 */
export let rememberScroll = function( ) {
    var mtx = d3.select( '#aw-traceability-matrix-widget' ).node().parentNode;
    scrollX = mtx.scrollLeft;
    scrollY = mtx.scrollTop;
};
/**
 * timeout_resize
 */
export let timeout_resize = function( ) {
    // clear timeout
    clearTimeout( doit );
    doit = setTimeout( self.reset_visualization_size, 500 );
};
/**
 * showEmptyRowsandCols
 */
export let showEmptyRowsandCols = function( ) {
};
/**
 * reset_visualization_size
 */
export let reset_visualization_size = function( ) {
    self.set_visualization_size();
    // pass the network data to d3_clustergram
    refreshMatrix( global_network_data );
    // reselect the selected cell
    if( selectedCell ) {
        d3.select( '.' + selectedCell )
            .attr( 'id', 'clicked_cell' )
            .classed( 'selected-cell', true );
    }
};
/**
 * reorder_click_row
 */
export let reorder_click_row = function( d ) {
    d3.select( '#clicked_row' ).attr( 'id', '' );
    d3.selectAll( '#row_text_and_buttons' ).classed( 'sorted', false );
    d3.select( this.parentNode ).classed( 'sorted', true );
    d3.selectAll( '.row_label_text .aw-relationshipmatrix-sortControl ' ).each( add_sortIcon_function );
    // highlight current
    d3.select( this.parentNode ).select( 'text' )
        .attr( 'id', 'clicked_row' );
    var eventData = {
        sortCol: d.uid === '' ? 'total' : d.uid
    };
    //fire event to show matrix with sorted data
    eventBus.publish( 'Arm0TraceabilityMatrix.sortTraceabilityMatrix', eventData );
};
/**
 * reorder_click_col
 */
export let reorder_click_col = function( d ) {
    var inst_term = d3.select( this.parentNode ).select( 'text' ).attr( 'full_name' );
    d3.select( '#clicked_col' ).attr( 'id', '' );
    d3.selectAll( '.col_label' ).classed( 'sorted', false );
    d3.selectAll( '.col_label_text' ).classed( 'sorted', false );
    d3.select( this.parentNode ).classed( 'sorted', true );
    d3.selectAll( '.col_label .aw-relationshipmatrix-sortControl' ).each( add_sortIcon_function );
    // highlight current
    d3.select( this.parentNode ).select( 'text' )
        .attr( 'id', 'clicked_col' );
    var eventData = {
        sortRow: d.uid === '' ? 'total' : d.uid
    };
    eventBus.publish( 'Arm0TraceabilityMatrix.sortTraceabilityMatrix', eventData );
};
/**
 * get_row_count
 */
export let get_row_count = function( ) {
    return row_nodes.length;
};
/**
 * get_col_count
 */
export let get_col_count = function( ) {
    return col_nodes.length;
};
/**
 * get_default_view 
 * test helper: returns true if treemode and false if listmode.
 * TODO: replace bools for strings.
 */
export let get_default_view = function( ) {
    return treeMode;
};
/**
 * get_network_data 
 * test helper: returns the current network data to verify things are in good shape.
 */
export let get_network_data = function( ) {
    return network_data;
};
export default exports = {
    refreshMatrix,
    getIcon,
    buildFlatTableColumnInfos,
    _buildFlatTableRows,
    tracelinkDeleted,
    setPageInfo,
    resetPageInfo,
    getRevisionObject,
    make_d3_clustergram,
    set_visualization_size,
    deteleTracelinkFromMap,
    calculateViewerHeight,
    prefFilter,
    paginationHandle,
    setCurrent,
    redirectToNextPrevPage,
    nextRowPageNavigation,
    previousColPageNavigation,
    nextColPageNavigation,
    collNavigationUp,
    rowNavigationUp,
    add_col_indent_lines,
    add_row_indent_lines,
    add_chevronIcon_function,
    getIndent,
    add_tracelinkIcon_function,
    add_sortIcon_function,
    add_typeIcon_function,
    row_function,
    handleCellSelection,
    highlightSelection,
    reset_visualization_size,
    showHeatMap,
    showEmptyRowsandCols,
    tracelinkDirectionChangeAction,
    reorder_click_row,
    reorder_click_col,
    navigate_click_col,
    rememberScroll,
    navigate_click_row,
    timeout_resize,
    clearHighlight,
    get_row_count,
    get_col_count,
    get_default_view,
    get_network_data
};
/**
 * Add element services
 * @memberof NgServices
 * @member reqTraceabilityMatrixService
 * @returns {Object} serViceObject
 */
app.factory( 'reqTraceabilityMatrixService', () => exports );