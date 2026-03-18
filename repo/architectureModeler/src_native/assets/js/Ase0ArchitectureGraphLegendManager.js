// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Ase0ArchitectureGraphLegendManager
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import legendSvc from 'js/graphLegendService';

var exports = {};

let _legendData = {};

var _getLegendData = function( viewName ) {
    let deferred = AwPromiseService.instance.defer();

    if( _legendData !== null && _legendData[ viewName ] ) {
        deferred.resolve( _legendData[ viewName ] );
        return deferred.promise;
    }

    let soaInput = {
        "viewName": viewName
    };
    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceSysEng-2018-05-DiagramManagement', 'getDiagramLegend5', soaInput ).then(
        function( response ) {
            let legData = null;
            // Process SOA response
            if( response.legendTypesJSON && response.legendTypesJSON.length > 0 ) {
                legData = JSON.parse( response.legendTypesJSON );
                _legendData[ viewName ] = legData;
            }

            if( response.legendTypeNames && response.legendTypeNames.length > 0 ) {
                loadModelTypes( response.legendTypeNames );
            }

            deferred.resolve( legData );

        },
        function( error ) {
            deferred.reject( error );
        } );

    return deferred.promise;
};

/*
 * method to get the legend information
 */
export let getLegendData = function( viewName, legend ) {
    let deferred = AwPromiseService.instance.defer();

    let underlyingObject = null;
    let localViewName = null;
    let aceActiveCtx = appCtxSvc.getCtx( "aceActiveContext" );
    if( aceActiveCtx && aceActiveCtx.context.elementToPCIMap ) {
        if( aceActiveCtx.context.productContextInfo && aceActiveCtx.context.productContextInfo.uid ) {
            if( (_.invert( aceActiveCtx.context.elementToPCIMap ) )[ aceActiveCtx.context.productContextInfo.uid ] ) {
                var modelObj = cdm.getObject( (_.invert( aceActiveCtx.context.elementToPCIMap ) )[ aceActiveCtx.context.productContextInfo.uid ] );
                if( modelObj && modelObj.props.awb0UnderlyingObject && modelObj.props.awb0UnderlyingObject.dbValues
                    && modelObj.props.awb0UnderlyingObject.dbValues.length > 0 ) {
                    underlyingObject = cdm.getObject( modelObj.props.awb0UnderlyingObject.dbValues[ 0 ] );
                }
            }
        }
    } else if( aceActiveCtx && aceActiveCtx.context && aceActiveCtx.context.topElement
        && aceActiveCtx.context.topElement.props.awb0UnderlyingObject
        && aceActiveCtx.context.topElement.props.awb0UnderlyingObject.dbValues
        && aceActiveCtx.context.topElement.props.awb0UnderlyingObject.dbValues.length > 0 ) {
        underlyingObject = cdm.getObject( aceActiveCtx.context.topElement.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }
    if(underlyingObject && underlyingObject.modelType) {
        localViewName = viewName + "." + underlyingObject.modelType.name;
    }

    _getLegendData( localViewName ).then( function( legendData ) {
        if( legendSvc ) {
            legendSvc.initLegendViewsData( legendData );
            legend.legendViews = legendData.legendViews;
            setLabelCategories( legend.legendViews[ 0 ] );
        }
        deferred.resolve();
    } );
    return deferred.promise;
};

/**
 *
 * Loading Relation model types in cache which are added in Relations Legend which are needed to decide whether its
 * type of connection or Trace link relation while drawing
 *
 * @param {StringArray} listOfModelTypes - relation type names loaded in relation legend panel
 */
var loadModelTypes = function( listOfModelTypes ) {
    if( listOfModelTypes.length > 0 ) {
        soaSvc.ensureModelTypesLoaded( listOfModelTypes );
    }
};

/*
 * method returns the category type of the graph element
 */
export let getCategoryType = function( type, scopeFilter, legendViews ) {
    var categoryType = ( type.length > 0 ) ? 'Other' : '';

    for( var i = 0; i < legendViews.categoryTypes.length; i++ ) {
        var categories = legendViews.categoryTypes[ i ];
        for( var j = 0; j < categories.categories.length; j++ ) {
            var subCategory = categories.categories[ j ].subCategories;
            if( scopeFilter ) {
                if( ( !categories.categories[ j ].scope ) ||
                    ( categories.categories[ j ].scope && categories.categories[ j ].scope !== scopeFilter ) ) {
                    continue;
                }
            }

            var categoryElement = _.filter( subCategory, function( typeName ) {
                return ( typeName.internalName === type );
            } );
            if( categoryElement.length > 0 ) {
                return categoryElement[ 0 ].parent.internalName;
            }
        }
    }
    return categoryType;
};

/*
 * method returns the category type of the graph element
 */
export let getCategoryTypeFromObjectUid = function( uid, scopeFilter, legendViews ) {
    var modelObject = cdm.getObject( uid );
    if( !modelObject ) {
        return '';
    }

    return exports.getCategoryType( modelObject.type, scopeFilter, legendViews );
};

/*
 * method to set the filtered categories in legend
 */
export let setCategoryFilters = function( categoryType, categoryNames, legendView ) {
    if( !categoryType || !categoryNames || !legendView || ( categoryNames && categoryNames.length === 0 ) ) {
        return;
    }

    var objectCategoryType = _.find( legendView.categoryTypes, {
        internalName: categoryType
    } );

    if( objectCategoryType ) {
        _.forEach( categoryNames, function( categoryName ) {
            var category = _.find( objectCategoryType.categories, {
                internalName: categoryName
            } );
            if( category ) {
                category.isFiltered = true;
            }
        } );
    }
};

/**
 * Initialize the category API on graph model. The APIs will be used to calculate legend count.
 *
 * @param {Object} graphModel the graph model object
 */
export let initGraphCategoryApi = function( graphModel ) {
    graphModel.categoryApi = {
        getNodeCategory: function( node ) {
            if( node && node.appData ) {
                return node.appData.category;
            }

            return null;
        },
        getEdgeCategory: function( edge ) {
            if( edge ) {
                return edge.category;
            }
            return null;
        },
        getGroupRelationCategory: function() {
            return "Structure";
        },
        getPortCategory: function( port ) {
            if( port ) {
                return port.category;
            }
            return null;
        },
        getBoundaryCategory: function( boundary ) {
            if( boundary ) {
                return boundary.category;
            }
            return null;
        }
    };
};
/**
 * Set label categories from legend view
 *
 * @param {Object} legendView the legend view object
 */
var setLabelCategories = function( legendView ) {
    var labelCategories = [];
    var relationsCategoryType = _.find( legendView.categoryTypes, {
        internalName: "relations"
    } );
    var portsCategoryType = _.find( legendView.categoryTypes, {
        internalName: "ports"
    } );
    if( relationsCategoryType ) {
        _.forEach( relationsCategoryType.categories, function( category ) {
            var categoryName = category.displayName;
            var internalName = category.internalName;
            //Need to skip Structure category
            if( categoryName.localeCompare( "Structure" ) !== 0 &&
                categoryName.localeCompare( "" ) !== 0 ) {
                var relationsCat = {
                    categoryName: categoryName,
                    internalName: internalName,
                    categoryState: false
                };
                labelCategories.push( relationsCat );
            }
        } );
    }
    if( portsCategoryType ) {
        _.forEach( portsCategoryType.categories, function( category ) {
            var categoryName = category.displayName;
            var internalName = category.internalName;
            if( categoryName.localeCompare( "" ) !== 0 ) {
                var portCat = {
                    categoryName: categoryName,
                    internalName: internalName,
                    categoryState: false
                };
                labelCategories.push( portCat );
            }
        } );
    }

    var architectureCtx = appCtxSvc.getCtx( "architectureCtx" );
    if( architectureCtx ) {
        if( architectureCtx.diagram ) {
            architectureCtx.diagram.labelCategories = labelCategories;
        } else {
            architectureCtx.diagram = {
                labelCategories: labelCategories
            };
        }
        appCtxSvc.updateCtx( "architectureCtx", architectureCtx );
    } else {
        architectureCtx = {
            diagram: {
                labelCategories: labelCategories
            }
        };
        appCtxSvc.registerCtx( "architectureCtx", architectureCtx );
    }
};

/**
 *  Get filtered out types list of given category type
 *
 * @param {categoryType} categoryType type of category 'objects' 'relations' or 'ports'
 * @return {filtered} list of types filtered out
 */
export let getFilteredTypes = function( categoryType ) {
    var filtered = [];
    var graphContext = appCtxSvc.getCtx( "graph" );
    if( graphContext && graphContext.legendState && graphContext.legendState.activeView ) {
        var activeLegendView = graphContext.legendState.activeView;
        if( activeLegendView.filteredCategories ) {
            _.forEach( activeLegendView.filteredCategories, function( category ) {
                if( category.categoryType === categoryType ) {
                    _.forEach( category.subCategories, function( subcategory ) {
                        filtered.push( subcategory.internalName );
                    } );
                }
            } );
        }
    }
    return filtered;
};

/**
 * Get active categories list of given category type
 * @param {categoryType} categoryType categoryType type of category 'objects' 'relations' or 'ports'
 * @return {unfiltered} list of categories which are active
 */
var getUnfilteredCategories = function( categoryType ) {
    var unfiltered = [];
    var graphContext = appCtxSvc.getCtx( "graph" );
    if( graphContext && graphContext.legendState && graphContext.legendState.activeView ) {
        var activeLegendView = graphContext.legendState.activeView;
        var relationsCategoryType = _.find( activeLegendView.categoryTypes, {
            internalName: categoryType
        } );
        if( relationsCategoryType ) {
            _.forEach( relationsCategoryType.categories, function( category ) {
                if( !category.isFiltered ) {
                    _.forEach( category.subCategories, function( subcategory ) {
                        unfiltered.push( subcategory );
                    } );
                }
            } );
        }
    }
    return unfiltered;
};

/**
 * Get active types list of given category type
 * @param {categoryType} categoryType categoryType type of category 'objects' 'relations' or 'ports'
 * @return {unfilteredTypes} list of types which are active
 */
export let getUnfilteredTypes = function( categoryType ) {
    var unfilteredTypes = [];
    var unfilteredCategories = getUnfilteredCategories( categoryType );
    if( unfilteredCategories && unfilteredCategories.length > 0 ) {
        _.forEach( unfilteredCategories, function( subcategory ) {
            unfilteredTypes.push( subcategory.internalName );
        } );
    }
    return unfilteredTypes;
};

/**
 * Check which all types are active as per Relations Legend filter
 *
 * @param {types} types types to check if active or inactive as per legend filters
 * @return {unfiltered} unfiltered types list
 */
export let getVisibleRelationTypes = function( types ) {
    var unfiltered = [];
    if( types && types.length > 0 ) {
        var activeRelationTypes = exports.getUnfilteredTypes( "relations" );
        var unfilteredCategories = getUnfilteredCategories( "relations" );
        var filteredTypes = exports.getFilteredTypes( "objects" );
        if( activeRelationTypes && activeRelationTypes.length > 0 ) {
            _.forEach( types, function( type ) {
                var typeToAdd = null;
                var objTypes = type.split( ';' );

                if( objTypes.length > 0 && objTypes[ 0 ] && objTypes[ 1 ] ) {
                    var relType = objTypes[ 0 ];
                    var objType = objTypes[ 1 ];
                    var scope = null;
                    var tlType = false;
                    if( _.indexOf( relType, ':' ) !== -1 ) {
                        var tlTypes = relType.split( ':' );
                        if( tlTypes.length > 0 && tlTypes[ 0 ] && tlTypes[ 1 ] === 'Context' ) {
                            relType = tlTypes[ 0 ];
                            scope = 'Context';
                        }
                    }
                    // Additional check for checking if trace link wso or occurrence
                    if( scope === 'Context' ) {
                        tlType = true;
                    } else {
                        var modelType = cmm.getType( relType );
                        if( modelType ) {
                            if( cmm.isInstanceOf( 'FND_TraceLink', modelType ) ) {
                                tlType = true;
                                scope = "Global";
                            }
                        }
                    }

                    if( !tlType && _.indexOf( activeRelationTypes, relType ) !== -1 ) {
                        typeToAdd = type;
                    } else if( tlType && unfilteredCategories.length > 0 ) {
                        var matchingCategory = _.find( unfilteredCategories, function( typeCategory ) {
                            return typeCategory.internalName === relType && typeCategory.parent && typeCategory.parent.scope === scope;
                        } );
                        if( matchingCategory ) {
                            typeToAdd = type;
                        }
                    }
                    // check if other end of relations in filtered or not filtered
                    if( typeToAdd && objType ) {
                        if( filteredTypes && _.indexOf( filteredTypes, objType ) === -1 ) {
                            unfiltered.push( type );
                        }
                    }
                }
            } );
        }
    }
    return unfiltered;
};

export default exports = {
    getLegendData,
    getCategoryType,
    getCategoryTypeFromObjectUid,
    setCategoryFilters,
    initGraphCategoryApi,
    getFilteredTypes,
    getUnfilteredTypes,
    getVisibleRelationTypes
};
app.factory( 'Ase0ArchitectureGraphLegendManager', () => exports );
