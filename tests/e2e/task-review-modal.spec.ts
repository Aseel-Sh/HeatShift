import { expect, test, type Page } from "@playwright/test";

async function openReview(page:Page){
  await page.route("**/api/parse-plan",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{siteName:"Review site",city:"riyadh",shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"16:00",crewSize:8,nonAcclimatizedWorkers:1,assumptions:[],missingInformation:[],tasks:[
    {nameEn:"Excavation",nameAr:"الحفر",activityKind:"work",durationMinutes:60,workload:null,environment:"shaded_outdoor",splittable:false,timingPreference:"preferred",mustSchedule:false,suggestedWorkload:"heavy",suggestedEnvironment:"direct_sun",suggestedSplittable:true},
    {nameEn:"Break",nameAr:"استراحة",activityKind:"break",durationMinutes:15,recoveryEligibility:"eligible",timingPreference:"fixed",requestedStart:"09:00",requestedEnd:"09:15",mustSchedule:false},
    {nameEn:"Lunch",nameAr:"غداء",activityKind:"meal",durationMinutes:30,recoveryEligibility:"eligible",timingPreference:"preferred",requestedStart:"12:00",requestedEnd:"12:30",mustSchedule:false},
  ]}})}));
  await page.goto("/");
  await page.getByLabel("Import work plan").fill("Excavation followed by a break and lunch for the crew.");
  await page.getByRole("button",{name:"Structure task list"}).click();
  await expect(page.getByRole("heading",{name:"Task plan"})).toBeVisible();
}

test("task review is read-only and the focused work modal owns editing",async({page})=>{
  await openReview(page);
  const table=page.locator(".task-review-table");
  await expect(table.locator("input, select, textarea")).toHaveCount(0);
  await expect(table.getByRole("button",{name:"Edit",exact:true})).toHaveCount(3);
  const tableBox=await table.boundingBox();const deleteBox=await page.getByTestId("task-row-0").getByRole("button",{name:"Delete 1"}).boundingBox();
  expect(tableBox&&deleteBox&&deleteBox.x+deleteBox.width<=tableBox.x+tableBox.width).toBe(true);
  await expect(page.getByTestId("task-row-0")).toContainText("Needs 1 input");

  await page.getByTestId("task-row-0").getByRole("button",{name:"Edit",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await expect(dialog).toContainText("Edit: Excavation");
  await expect(page.getByLabel("Workload")).toBeFocused();
  await expect(page.getByLabel("Workload")).toBeVisible();
  await expect(page.getByLabel("Work area")).toBeVisible();
  await expect(page.getByLabel("Can split?")).toBeVisible();
  await expect(dialog.getByText("Workload suggestion: Heavy",{exact:true})).toBeVisible();
  await expect(dialog.getByText("Work-area suggestion: Direct sun",{exact:true})).toBeVisible();
  await expect(dialog.getByText("Split-setting suggestion: Yes",{exact:true})).toBeVisible();
  await expect(dialog.locator('[data-suggestion-field="workload"]')).toHaveCSS("grid-row-start","6");
  await expect(dialog.locator('[data-suggestion-field="environment"]')).toHaveCSS("grid-row-start","6");

  await dialog.getByText("Workload suggestion: Heavy",{exact:true}).locator("..").getByRole("button",{name:"Apply"}).click();
  await expect(page.getByLabel("Workload")).toHaveValue("heavy");
  await expect(page.getByLabel("Work area")).toHaveValue("shaded_outdoor");
  await dialog.getByText("Work-area suggestion: Direct sun",{exact:true}).locator("..").getByRole("button",{name:"Dismiss"}).click();
  await expect(dialog.getByText("Work-area suggestion: Direct sun",{exact:true})).toHaveCount(0);
  await expect(page.getByLabel("Work area")).toHaveValue("shaded_outdoor");
  await page.getByLabel("Priority").selectOption("required");
  await page.getByRole("button",{name:"Save",exact:true}).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("task-row-0")).toContainText("Heavy");
  await expect(page.getByTestId("task-row-0")).toContainText("Required today");
  await expect(page.getByTestId("task-row-0").getByRole("button",{name:"Edit",exact:true})).toBeFocused();
});

test("break and meal modals hide work fields and navigation advances through review",async({page})=>{
  await openReview(page);
  await page.getByTestId("task-row-1").getByRole("button",{name:"Edit",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Edit: Break");
  await expect(page.getByLabel("Recovery eligibility")).toBeVisible();
  await expect(page.getByLabel("Workload")).toHaveCount(0);
  await expect(page.getByLabel("Work area")).toHaveCount(0);
  await expect(page.getByLabel("Can split?")).toHaveCount(0);
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Edit: Lunch");
  await expect(page.getByRole("button",{name:"Save and finish",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Save and finish",exact:true}).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("cancel, Escape, and task navigation protect unsaved changes",async({page})=>{
  await openReview(page);
  await page.getByTestId("task-row-1").getByRole("button",{name:"Edit",exact:true}).click();
  await page.getByLabel("English name").fill("Changed break");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toContainText("Discard unsaved changes?");
  await page.getByRole("button",{name:"Keep editing"}).click();
  await page.locator(".task-modal-backdrop").click({ position: { x: 4, y: 4 } });
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button",{name:"Keep editing"}).click();
  await page.locator(".modal-save-actions").getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button",{name:"Discard changes"}).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByTestId("task-row-1")).toContainText("Break");
  await expect(page.getByTestId("task-row-1")).not.toContainText("Changed break");
});

test("Arabic script is optional while required safety inputs still block save",async({page})=>{
  await openReview(page);
  await page.getByTestId("task-row-0").getByRole("button",{name:"Edit",exact:true}).click();
  await page.getByLabel("Arabic name").fill("English only");
  await page.getByRole("button",{name:"Save and next",exact:true}).click();
  await expect(page.getByText("Arabic name must contain Arabic script.")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Edit: Excavation");
  await expect(page.getByLabel("Workload")).toBeFocused();
  await page.getByLabel("Workload").selectOption("heavy");
  await page.getByRole("button",{name:"Save and next",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Edit: Break");
  await expect(page.getByText("Task 2 of 3",{exact:false})).toBeVisible();
});

test("undismissed suggestions do not block continuing to conditions",async({page})=>{
  await openReview(page);
  await page.getByTestId("task-row-0").getByRole("button",{name:"Edit",exact:true}).click();
  await page.getByLabel("Workload").selectOption("heavy");
  await expect(page.getByRole("dialog").getByText("Work-area suggestion: Direct sun",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Save",exact:true}).click();
  await page.getByRole("button",{name:"Continue to conditions"}).click();
  await expect(page.getByRole("heading",{name:"Conditions"})).toBeVisible();
});
