sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("com.krones.attendancecalc.attendance.controller.App", {
        onInit() {
            var oInputData = {
                DaysWorked: 0,
                OptionalHoliday: 0,
                LeaveTaken: 0,
                MyWorkingDays: 0,
                Date: new Date(),
                OfficeBalanceDays: 0,
                Quarter: "",
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
            var aHolidayList = {
                "MandatoryHolidays": [
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
                ],

            };
            var oModel = new sap.ui.model.json.JSONModel(aHolidayList);
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
            var mandatoryHolidays = this.getView().getModel("Holidays").getProperty("/MandatoryHolidays").filter(item => item.Quarter === oInputData.Quarter).reduce((acc, item) => acc + item.Days, 0);
            var ototalWeekDays = this.calculateWeekdaysInQuarter(dateObj);
            var remainingDays = ototalWeekDays - oInputData.DaysWorked - oInputData.LeaveTaken - mandatoryHolidays - oInputData.OptionalHoliday;
           var myWorkingDays = ototalWeekDays  - oInputData.LeaveTaken - mandatoryHolidays - oInputData.OptionalHoliday;
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
}
        
    });
});