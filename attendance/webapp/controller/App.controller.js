sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet"
], (Controller, MessageToast, JSONModel, Spreadsheet) => {
    "use strict";

    return Controller.extend("com.krones.attendancecalc.attendance.controller.App", {
        onInit() {
            this.onInitialLoad();
        },
        onInitialLoad: function () {
            var oInputData = {
                DaysWorked: 0,
                OptionalHoliday: 0,
                LeaveTaken: 0,
                MyWorkingDays: 0,
                Date: new Date(),
                OfficeBalanceDays: 0,
                Quarter: "",
                IsEditable: false,
                TotalDays: [
                    {
                        Quarter: "Q1",
                        Text: "Jan - Mar",
                        Days: 90,
                        Date: new Date("2024-01-01")
                    },
                    {
                        Quarter: "Q2",
                        Text: "Apr - Jun",
                        Days: 90,
                        Date: new Date("2024-04-01")
                    },
                    {
                        Quarter: "Q3",
                        Text: "Jul - Sep",
                        Days: 90,
                        Date: new Date("2024-07-01")
                    },
                    {
                        Quarter: "Q4",
                        Text: "Oct - Dec",
                        Days: 90,
                        Date: new Date("2024-10-01")
                    }

                ]
            }
            var oInputModel = new sap.ui.model.json.JSONModel(oInputData);
            this.getView().setModel(oInputModel, "InputModel");
            var oModel = new sap.ui.model.json.JSONModel({});
            this.getView().setModel(oModel, "Holidays");
            var aAttendanceCalculationData = {
                CalculationData: [
                    {
                        Desc: "Remaining Days",
                        Days: 30,
                        Quarter: "Q1"
                    },
                    {
                        Desc: "Days Completed",
                        Days: 0,
                        Quarter: "Q1"
                    }
                ]
            }
            var oAttendanceModel = new sap.ui.model.json.JSONModel(aAttendanceCalculationData);
            this.oVizFrame = this.getView().byId("idVizFrame");
            this.oVizFrame.setModel(oAttendanceModel);
            if (this.oVizFrame) {
                this.oVizFrame.setVizProperties({
                    plotArea: {
                        dataLabel: {
                            visible: true
                        },
                        title: {
                            visible: false
                        },

                    }
                });
            }
            // Define your custom colors
            var aCustomColors = ["#fac364", "#b6d957", , "#8cd3ff", "#d96557"];
            // Get the current viz properties
            var oVizProperties = this.oVizFrame.getVizProperties();

            // Set the new color palette
            if (!oVizProperties.plotArea) {
                oVizProperties.plotArea = {};
            }
            oVizProperties.plotArea.colorPalette = aCustomColors;

            // Apply the updated properties
            this.oVizFrame.setVizProperties(oVizProperties);
            this._openDB();



        },

        onQuarterChange: function (oEvent) {
            var selectedQuarter = oEvent.getSource().getSelectedKey();
            this.getView().getModel("InputModel").setProperty("/Quarter", selectedQuarter);
            var dateObj = oEvent.getSource().getSelectedItem().getBindingContext("InputModel").getObject().Date;
            var currentYear = new Date().getFullYear();
            var updatedDate = new Date(dateObj);
            updatedDate.setFullYear(currentYear);
            this.getView().getModel("InputModel").setProperty("/Date", updatedDate);
        },
        onLoadData: function () {
            var oInputData = this.getView().getModel("InputModel").getProperty("/");
            var dateObj = this.getView().getModel("InputModel").getProperty("/Date");
            var year = dateObj.getUTCFullYear();
            var totalDays = oInputData.TotalDays.find(item => item.Quarter === oInputData.Quarter).Days;
            var mandatoryHolidays = this.getView().getModel("Holidays").getProperty("/MandatoryHolidays").filter(item => item.Quarter === oInputData.Quarter).reduce((acc, item) => acc + parseInt(item.Days, 0), 0);
            var ototalWeekDays = this.calculateWeekdaysInQuarter(dateObj);
            var remainingDays = ototalWeekDays - oInputData.DaysWorked - oInputData.LeaveTaken - mandatoryHolidays - oInputData.OptionalHoliday;
            var myWorkingDays = ototalWeekDays - oInputData.LeaveTaken - mandatoryHolidays - oInputData.OptionalHoliday;
            var aAttendanceCalculationData = {
                CalculationData: [


                    {
                        Desc: "Remaining Days",
                        Days: remainingDays,
                        Quarter: oInputData.Quarter
                    }, {
                        Desc: "Days Completed",
                        Days: oInputData.DaysWorked,
                        Quarter: oInputData.Quarter
                    }
                ]
            }
            var oAttendanceModel = new sap.ui.model.json.JSONModel(aAttendanceCalculationData);
            this.getView().getModel("InputModel").setProperty("/MyWorkingDays", myWorkingDays);
            this.getView().getModel("InputModel").setProperty("/OfficeBalanceDays", this.calculateOfficeBalanceDaysForQuarter(myWorkingDays, oInputData.DaysWorked));
            this.oVizFrame.setModel(oAttendanceModel);


        },
        calculateWeekdaysInQuarter: function (date) {
            var year = date.getFullYear();
            // Quarters are 0 (Jan-Mar), 1 (Apr-Jun), 2 (Jul-Sep), 3 (Oct-Dec)
            var quarter = Math.floor(date.getMonth() / 3);
            // Get first day of the quarter (Month index: 0, 3, 6, or 9)
            var startDate = new Date(year, quarter * 3, 1);
            // Get last day of the quarter (First day of next quarter minus 1 day)
            var endDate = new Date(year, (quarter + 1) * 3, 0);
            var weekdayCount = 0;
            var current = new Date(startDate);
            while (current <= endDate) {
                const dayOfWeek = current.getDay();
                // 0 is Sunday, 6 is Saturday
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    weekdayCount++;
                }
                // Increment to the next day safely
                current.setDate(current.getDate() + 1);
            }
            return weekdayCount;
        },
        calculateOfficeBalanceDaysForQuarter: function (MyWorkingDays, InOfficeDays) {
            return Math.round((50 * MyWorkingDays / 100) - InOfficeDays);
        },
        onEditHolidays: function () {
            this.getView().getModel("InputModel").setProperty("/IsEditable", true);
        },














































        // -------------------------------
        // IndexedDB Initialize
        // -------------------------------
        _openDB: function () {
            try {
                const request = indexedDB.open("MyLocalDB", 1);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Create store only once
                    if (!db.objectStoreNames.contains("TableData")) {
                        db.createObjectStore("TableData", { keyPath: "id", autoIncrement: true });
                    }
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    //  MessageToast.show("DB initialized successfully");
                    this.onLoadFromLocalDB();
                    this.onLoadFromATHistory();
                };

                request.onerror = () => {
                    MessageToast.show("Failed to open IndexedDB");
                };
            } catch (e) {
                console.error("IndexedDB not supported:", e);
            }
        },
        onSaveToLocalDB: function () {
            this.onDeleteFromLocalDB(); // Clear existing record before saving new data
            try {
                if (!this.db) {
                    MessageToast.show("DB not ready");
                    return;
                }

                var tx = this.db.transaction("TableData", "readwrite");
                var store = tx.objectStore("TableData");
                var aHolidayList =
                    [
                        {
                            "Month": "January",
                            "Quarter": "Q1",
                            "Days": 2
                        },
                        {
                            "Month": "February",
                            "Quarter": "Q1",
                            "Days": 0
                        },
                        {
                            "Month": "March",
                            "Quarter": "Q1",
                            "Days": 0
                        },
                        {
                            "Month": "April",
                            "Quarter": "Q2",
                            "Days": 1
                        },
                        {
                            "Month": "May",
                            "Quarter": "Q2",
                            "Days": 1
                        },
                        {
                            "Month": "June",
                            "Quarter": "Q2",
                            "Days": 0
                        },
                        {
                            "Month": "July",
                            "Quarter": "Q3",
                            "Days": 0
                        },
                        {
                            "Month": "August",
                            "Quarter": "Q3",
                            "Days": 1
                        },
                        {
                            "Month": "September",
                            "Quarter": "Q3",
                            "Days": 0
                        },
                        {
                            "Month": "October",
                            "Quarter": "Q4",
                            "Days": 2
                        },
                        {
                            "Month": "November",
                            "Quarter": "Q4",
                            "Days": 0
                        },
                        {
                            "Month": "December",
                            "Quarter": "Q4",
                            "Days": 1
                        }
                    ];


                //   var aHolidayList = this.getView().getModel("Holidays").getProperty("/MandatoryHolidays");
                store.add({ "MandatoryHolidays": aHolidayList, Key: "HOLIDAYLIST" });


                // tx.oncomplete = (event) => MessageToast.show("Saved to DB");
                tx.oncomplete = (event) => {
                    MessageToast.show("Data fetched Successfully");
                    this.onLoadFromLocalDB();
                    this.getView().getModel("InputModel").setProperty("/IsEditable", false);

                };
                tx.onerror = () => MessageToast.show("Save failed");
            } catch (e) {
                console.error(e);
            }
        },
        onLoadFromLocalDB: function (sClear) {
            var tx = this.db.transaction("TableData", "readonly");
            var store = tx.objectStore("TableData");
            var request = store.getAll();

            request.onsuccess = (event) => {
                var data = event.target.result;

                // Bind to UI5 table
                var aHolidayList = data.filter(item => item.Key === "HOLIDAYLIST");
                if (aHolidayList.length > 0) {
                    this.getView().getModel("Holidays").setProperty("/MandatoryHolidays", aHolidayList[0].MandatoryHolidays);
                    this.getView().getModel("Holidays").setProperty("/ID", aHolidayList[0].id);
                }
                else {
                    if (sClear) {
                        this.getView().getModel("Holidays").setProperty("/MandatoryHolidays", []);
                    }
                    else {
                        this.onSaveToLocalDB();
                    }
                    // this.getView().getModel("Holidays").setProperty("/ID", 0);
                }

            };

            request.onerror = () => {
                MessageToast.show("Load failed");
            };
        },
        onDeleteFromLocalDB: function () {
            try {
                if (!this.db) {
                    MessageToast.show("DB not ready");
                    return;
                }
                // CRITICAL: Both strings must match your actual DB setup exactly
                var storeName = "TableData"; // <-- CHANGE THIS to match DevTools exactly
                var tx = this.db.transaction(storeName, "readwrite");
                var store = tx.objectStore(storeName);

                // var request = store.delete(id);
                var request = store.clear();

                request.onsuccess = () => {
                    MessageToast.show("Record Cleared successfully");
                    this.onLoadFromLocalDB("X"); // ✅ Now 'this' correctly refers to your controller
                };
                request.onerror = function (event) {
                    MessageToast.show("Delete failed: " + event.target.error.name);
                };

            } catch (error) {
                console.error(error);
                MessageToast.show("An error occurred");
            }
        },
        onUpdateEntry: function () {
            try {
                if (!this.db) {
                    MessageToast.show("DB not ready");
                    return;
                }

                var tx = this.db.transaction("TableData", "readwrite");
                var store = tx.objectStore("TableData");

                // CRITICAL: Ensure the target "id" matches your existing row exactly
                var updatedPayload = {
                    "id": this.getView().getModel("Holidays").getProperty("/ID"),
                    "MandatoryHolidays": this.getView().getModel("Holidays").getProperty("/MandatoryHolidays"),
                    Key: "HOLIDAYLIST"
                };

                // put() updates the existing item because the "id" already exists
                var request = store.put(updatedPayload);
                //     request.onsuccess = () => MessageToast.show("Data Updated successfully");
                request.onsuccess = (event) => {
                    // this.db = event.target.result;
                    MessageToast.show("Data Updated successfully");
                    this.getView().getModel("InputModel").setProperty("/IsEditable", false);

                };
                request.onerror = () => MessageToast.show("Update failed");

            } catch (e) {
                console.error(e);
            }
        },
        // -------------------------------
        // IndexedDB Operations: Save, Load, Delete
        // -------------------------------
        //Attendance History for User 
        onSaveAttendanceHistory: function () {

            try {
                if (!this.db) {
                    MessageToast.show("DB not ready");
                    return;
                }

                var tx = this.db.transaction("TableData", "readwrite");
                var store = tx.objectStore("TableData");
                var AttendanceData = this.getView().getModel("InputModel").getProperty("/");
                var dateObj = new Date();
                var totalDays = AttendanceData.TotalDays.find(item => item.Quarter === AttendanceData.Quarter).Days;
                var mandatoryHolidays = this.getView().getModel("Holidays").getProperty("/MandatoryHolidays").filter(item => item.Quarter === AttendanceData.Quarter).reduce((acc, item) => acc + parseInt(item.Days, 0), 0);
                var ototalWeekDays = this.calculateWeekdaysInQuarter(dateObj);
                var remainingDays = AttendanceData.remainingDays

                var aAttendanceHistoryData = {
                    "Date": dateObj,
                    "Quarter": AttendanceData.Quarter,
                    "MandatoryHolidays": mandatoryHolidays,
                    "OptionalHoliday": AttendanceData.OptionalHoliday,
                    "LeaveTaken": AttendanceData.LeaveTaken,
                    "OfficeBalanceDays": AttendanceData.OfficeBalanceDays,
                    "MyWorkingDays": AttendanceData.MyWorkingDays,
                    "Percentage": Math.round((AttendanceData.DaysWorked / AttendanceData.MyWorkingDays) * 100),
                    "Key": "ATHISTORY"
                };
                var request = store.add(aAttendanceHistoryData);
                // tx.oncomplete = () => MessageToast.show("Saved to DB");
                tx.oncomplete = (event) => {

                    MessageToast.show("Saved to DB");
                    this.onLoadFromATHistory(); // Refresh the history list after deletion

                };

                tx.onerror = () => MessageToast.show("Save failed");
            } catch (e) {
                console.error(e);
            }

        },
        onLoadFromATHistory: function () {
            var tx = this.db.transaction("TableData", "readonly");
            var store = tx.objectStore("TableData");
            var request = store.getAll();

            request.onsuccess = (event) => {
                var data = event.target.result;

                // Bind to UI5 table
                var aHistory = data.filter(item => item.Key === "ATHISTORY");
                var oAttendanceHistoryModel = new sap.ui.model.json.JSONModel({ Data: aHistory });
                this.getView().setModel(oAttendanceHistoryModel, "AttendanceHistory");


            };

            request.onerror = () => {
                MessageToast.show("Load failed");
            };
        },
        onUserHistoryItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oData = oItem.getSelectedItem().getBindingContext("AttendanceHistory").getObject()
            this.getView().getModel("InputModel").setProperty("/Date", new Date(oData.Date));
            this.getView().getModel("InputModel").setProperty("/Quarter", oData.Quarter);
            this.getView().getModel("InputModel").setProperty("/OptionalHoliday", oData.OptionalHoliday);
            this.getView().getModel("InputModel").setProperty("/LeaveTaken", oData.LeaveTaken);
            this.getView().getModel("InputModel").setProperty("/MyWorkingDays", oData.MyWorkingDays);
            this.getView().getModel("InputModel").setProperty("/OfficeBalanceDays", oData.OfficeBalanceDays);
            this.getView().getModel("InputModel").setProperty("/DaysWorked", Math.round((oData.Percentage * oData.MyWorkingDays) / 100));
            this.onLoadData();
        },
        onDeleteHistoryItem: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("AttendanceHistory");
            var oData = oContext.getObject();
            var tx = this.db.transaction("TableData", "readwrite");
            var store = tx.objectStore("TableData");
            var request = store.delete(oData.id);

            request.onsuccess = () => {
                MessageToast.show("Record deleted successfully");
                this.onLoadFromATHistory(); // Refresh the history list after deletion
            };
            request.onerror = () => {
                MessageToast.show("Delete failed");
            };
        },
        onExportExcel: function () {
            // 1. Get the table reference and its JSON model binding path
            var oTable = this.byId("UserHistoryTable");
            var oBinding = oTable.getBinding("items");
            var oModel = oTable.getModel("AttendanceHistory"); // Use your actual model name

            // 2. Define the Excel columns matching your data properties
            var aColumns = [
                { label: "Date", property: "Date", type: "string" },
                { label: "Quarter", property: "Quarter", type: "string" },
                { label: "MyWorkingDays", property: "MyWorkingDays", type: "string" },
                { label: "OptionalHoliday", property: "OptionalHoliday", type: "string" },
                { label: "MandatoryHolidays", property: "MandatoryHolidays", type: "string" },
                { label: "LeaveTaken", property: "LeaveTaken", type: "string" },
                { label: "OfficeBalanceDays", property: "OfficeBalanceDays", type: "string" },
                { label: "Percentage", property: "Percentage", type: "string" },



            ];


            // 3. Define spreadsheet configuration settings
            var oSettings = {
                workbook: { columns: aColumns },
                dataSource: oModel.getProperty(oBinding.getPath()), // Extracts raw data array from the JSON model
                fileName: "Attendance_History.xlsx",
                worker: false // Set to false to avoid web-worker cross-origin issues in local environments
            };

            // 4. Initialize and trigger the download
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    sap.m.MessageToast.show("Excel downloaded successfully!");
                })
                .finally(function () {
                    oSheet.destroy(); // Always clean up the object to free up memory
                });
        }


    });
});