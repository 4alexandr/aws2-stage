:: Copyright 2019 Siemens Product Lifecycle Management Software Inc.

:: Stage dir settings
set AWS2_STAGE_DIR=%~dps0

:: the Active Workspace Client stage directory
set AWC_STAGE_DIR=%AWS2_STAGE_DIR%
IF NOT DEFINED AWC_STAGE_DIR @ECHO AWC_STAGE_DIR NOT DEFINED & EXIT /B 1

SET ROOT=%AWC_STAGE_DIR%

:: Add Node.js to PATH
SET PATH=%AWS2_STAGE_DIR%\bin\wntx64\nodejs;%AWS2_STAGE_DIR%\bin;%AWS2_STAGE_DIR%\node_modules\.bin;%PATH%

:: Disable requested by 3rd party tooling for donations
SET DISABLE_OPENCOLLECTIVE=true

:: Clear error variables
@SET ERRORLEVEL=
@SET ERROR_CODE=
