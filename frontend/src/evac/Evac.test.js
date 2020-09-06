import React from "react";
import { render, waitForElementToBeRemoved } from "@testing-library/react";
import Evac from "./Evac";
import { EvacTeamMemberForm, TeamMemberSelector } from "./EvacForms";

describe("Render evac", () => {
  it("Render Evac", () => {
    const { getByText } = render(<Evac />);
    expect(getByText(/NEW TEAM/)).toBeTruthy();
    expect(getByText(/TEAM LIST/)).toBeTruthy();
    expect(getByText(/DEPLOY/)).toBeTruthy();
    expect(getByText(/DEBRIEF/)).toBeTruthy();
    expect(getByText(/BACK/)).toBeTruthy();
  });

  it("Render evac team selectiong form", async () => {
    const { getByText, findByText } = render(<TeamMemberSelector />);
    expect(getByText(/Select Evacuation Team Member/)).toBeTruthy();
    expect(getByText(/Deploy!/)).toBeTruthy();
  });

  it("Render new evac team member form", async () => {
    const { getByText, findByText } = render(<EvacTeamMemberForm />);
    expect(getByText(/First Name*/)).toBeTruthy();
    expect(getByText(/Last Name*/)).toBeTruthy();
    expect(getByText(/Phone*/)).toBeTruthy();
    expect(getByText(/Agency ID/)).toBeTruthy();
  });
});
