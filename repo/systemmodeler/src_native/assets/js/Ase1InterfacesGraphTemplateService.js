// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Interfaces tab graph template service
 *
 * @module js/Ase1InterfacesGraphTemplateService
 */
import * as app from 'app';
import _ from 'lodash';
import logger from 'js/logger';
import graphStyleUtils from 'js/graphStyleUtils';
import awIconSvc from 'js/awIconService';

'use strict';

var exports = {};
var THUMBNAIL_URL = 'thumbnail_image';

var NODE_TEMPLATE_NAME = 'Ase1InterfacesNodeTemplate';

var CIRCLE_NODE_TEMPLATE_NAME = 'Ase1InterfacesCircleNodeTemplate';

/**
 * Binding class name for node
 */
export let NODE_HOVERED_CLASS = 'relation_node_hovered_style_svg';

/**
 * Binding class name for text inside the tile
 */
export let TEXT_HOVERED_CLASS = 'relation_TEXT_hovered_style_svg';

/**
 * CSS style for Node selected
 */
export let NODE_SELECTED_STYLE = 'aw-widgets-cellListItemNodeSelected';

/**
 * CSS Style Name for default node
 */
export let NODE_DEFAULT_STYLE = 'aw-widgets-cellListItemNode';

/**
 * The interpolate delimiter used in node SVG template
 */
var _nodeTemplateInterpolate = {
    interpolate: /<%=([\s\S]+?)%>/g
};

/**
 * Get node template by populate the base template with given binding property names
 * @param {*} nodeTemplateCache node template cache
 * @param {*}  isSystemOfInterest true if system of interest
 * @return {Object} newTemplate
 */
export let getNodeTemplate = function( nodeTemplateCache, isSystemOfInterest ) {
    //template doesn't exist, construct it and put in template cache
    var baseTemplateId = null;

    baseTemplateId = isSystemOfInterest ? CIRCLE_NODE_TEMPLATE_NAME : NODE_TEMPLATE_NAME;

    var baseTemplate = nodeTemplateCache[ baseTemplateId ];

    if( !baseTemplate ) {
        logger.error( 'SVG template has not been registered. Template ID: ' + baseTemplateId );
        return null;
    }

    var templateId = baseTemplateId;

    var template = nodeTemplateCache[ templateId ];
    if( template ) {
        return template;
    }

    var newTemplate = _.cloneDeep( baseTemplate );
    newTemplate.templateId = templateId;
    newTemplate.templateContent = getTemplateContent( templateId, baseTemplate.templateContent );

    //cache the new template
    nodeTemplateCache[ templateId ] = newTemplate;
    return newTemplate;
};

var setNodeThumbnailProperty = function( nodeObject, bindProperties ) {
    if( !awIconSvc ) {
        return;
    }

    var imageUrl = awIconSvc.getThumbnailFileUrl( nodeObject );

    //show type icon instead if thumbnail doesn't exist
    if( !imageUrl ) {
        imageUrl = awIconSvc.getTypeIconFileUrl( nodeObject );
    }

    bindProperties[ THUMBNAIL_URL ] = graphStyleUtils.getSVGImageTag( imageUrl );
};

/**
 * Get the binding properties for the given node object
 *
 * @param {Object} nodeObject the node model object
 * @param {String} labelText label text displayed on node
 * @return {Object} properties - the object including all the required binding properties for a node template
 */
export let getBindProperties = function( nodeObject, labelText ) {
    var properties = {};
    properties.Title = labelText;
    setHoverNodeProperty( properties, null );
    //get thumbnail for node
    setNodeThumbnailProperty( nodeObject, properties );

    return properties;
};

/**
 * Construct the node template from a base template with the bind properties. The first two properties will be
 * interpolate to title and sub_title. The remaining properties will bind to property list.
 *
 * @param {String} templateId the template ID of the constructed template. If not given, the template ID will be the string
 *            of bind property Names joined by '-'.
 * @param {String} baseTemplateString the base template string with interpolate delimiter '<%= %>'.
 * @return {*} the generated template string with bind property names been interpolated.
 */
var getTemplateContent = function( templateId, baseTemplateString ) {
    var templateData = {};

    if( templateId ) {
        templateData.template_id = templateId;
    }

    templateData.title = 'Title';

    return constructNodeTemplate( baseTemplateString, templateData );
};

var constructNodeTemplate = function( baseTemplateString, templateData ) {
    if( !baseTemplateString ) {
        return '';
    }

    var bindData = {};
    if( templateData ) {
        bindData = _.clone( templateData );
    }

    if( !bindData.property_list ) {
        bindData.property_list = [];
    }
    var nodeTemplate = _.template( baseTemplateString, _nodeTemplateInterpolate );
    return nodeTemplate( bindData );
};

var setHoverNodeProperty = function( properties, hoveredClass ) {
    if( hoveredClass ) {
        properties[ exports.NODE_HOVERED_CLASS ] = hoveredClass;
        properties[ exports.TEXT_HOVERED_CLASS ] = hoveredClass;
    } else {
        properties[ exports.NODE_HOVERED_CLASS ] = 'aw-graph-noeditable-area';
        properties[ exports.TEXT_HOVERED_CLASS ] = '';
    }
};

export default exports = {
    NODE_HOVERED_CLASS,
    TEXT_HOVERED_CLASS,
    NODE_SELECTED_STYLE,
    NODE_DEFAULT_STYLE,
    getNodeTemplate,
    getBindProperties
};
