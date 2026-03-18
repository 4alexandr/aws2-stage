// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Defines {@link mbm3DViewerUtils} which Listens to clicks of mbm 3 D view
 *
 * @module js/mbm3DViewerUtils
 */
import eventBus from 'js/eventBus';

/**
 * Listens to clicks of 3 D view 
 * @param {data} data of the active view
 */
export let mbmInitialize3DViewerClickListener = function( data ) {
   data.mbm3DViewerClickEvent=function (contextKey){
    eventBus.publish( 'ace.activateWindow', { key: contextKey } );
   };
};

export default  {
    mbmInitialize3DViewerClickListener
};

