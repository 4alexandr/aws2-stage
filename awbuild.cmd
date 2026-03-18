:: Copyright 2019 Siemens Product Lifecycle Management Software Inc.

:: ################################################################################
:: # Note:
:: #  This script is called by the installer to produce the Active Workspace site.
:: #  The use of this script and any other artifacts during the Active Workspace site
:: #  creation is subject to change.
:: ################################################################################

@IF NOT DEFINED echostate set echostate=off
@ECHO %echostate%

:: Run the initialize environment variable script from the same directory as this script.
CALL %~dps0\initenv.cmd %*

CD /D %AWC_STAGE_DIR%

:: Build bundles by default
SET DRAFT=false

CALL npm run build
@ECHO %echostate%
IF %ERRORLEVEL% NEQ 0 @ECHO build error & EXIT /B %ERRORLEVEL%

CALL npm run publish
@ECHO %echostate%
IF %ERRORLEVEL% NEQ 0 @ECHO publish error & EXIT /B %ERRORLEVEL%
