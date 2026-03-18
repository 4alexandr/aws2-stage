// Copyright (c) 2020 Siemens
import visViewerIntService from 'js/visViewerIntService';

/**
 * @module js/visWebInstanceProvider
 */
/**
 * Return MFE-vis-Web instance
 * @param {String} id vis web
 * @returns {Object} MFE-vis-Web instance
 */
const getVisWebInstance = ( id ) => {
    return visViewerIntService.getVisWebInstance( id );
};
export default {
    getVisWebInstance
};
