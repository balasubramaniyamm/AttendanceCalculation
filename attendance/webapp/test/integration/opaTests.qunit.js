/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["com/krones/attendancecalc/attendance/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
