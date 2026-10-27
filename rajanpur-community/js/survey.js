
"use strict";

const SUPABASE_FUNCTION_URL =
    "https://znrnikbsvasxhevhetey.supabase.co/functions/v1/submit-community-survey";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_2lsOrVLtzvaodAvHM8lkkQ_BngngJdk";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("communitySurveyForm");
    if (!form) return;

    const get = (id) => document.getElementById(id);

    const fullName = get("fullName");
    const areaSelect = get("area");
    const otherAreaGroup = get("otherAreaGroup");
    const otherAreaInput = get("otherArea");
    const profession = get("profession");
    const organization = get("organization");
    const priorityOptions = get("priorityOptions");
    const priorityError = get("priorityError");
    const otherIssueGroup = get("otherIssueGroup");
    const otherIssueInput = get("otherIssue");
    const issueDetails = get("issueDetails");
    const solution = get("solution");
    const formMessage = get("formMessage");
    const contactConsent = get("contactConsent");
    const phoneInput = get("phone");
    const emailInput = get("email");

    const priorityCheckboxes = Array.from(
        form.querySelectorAll('input[name="priorities"]')
    );

    const submitButton = form.querySelector('button[type="submit"]');

    function showMessage(message, type = "error") {
        if (!formMessage) return;

        formMessage.textContent = message;
        formMessage.className = "form-message mt-3 " + type;
        formMessage.hidden = false;
        formMessage.setAttribute("role", "status");
        formMessage.setAttribute("aria-live", "polite");
    }

    function clearMessage() {
        if (!formMessage) return;

        formMessage.textContent = "";
        formMessage.hidden = true;
        formMessage.className = "form-message mt-3";
    }

    function updateOtherArea() {
        const showOther = areaSelect.value === "Other";

        if (otherAreaGroup) otherAreaGroup.hidden = !showOther;

        otherAreaInput.required = showOther;

        if (!showOther) {
            otherAreaInput.value = "";
            otherAreaInput.classList.remove("is-invalid");
        }
    }

    function updateOtherIssue() {
        const showOther = priorityCheckboxes.some(
            (checkbox) =>
                checkbox.checked && checkbox.value === "Other"
        );

        if (otherIssueGroup) otherIssueGroup.hidden = !showOther;

        otherIssueInput.required = showOther;

        if (!showOther) {
            otherIssueInput.value = "";
            otherIssueInput.classList.remove("is-invalid");
        }
    }

    function validatePriorities() {
        const selected = priorityCheckboxes.filter(
            (checkbox) => checkbox.checked
        );

        const valid = selected.length >= 1 && selected.length <= 3;

        if (priorityError) priorityError.hidden = valid;

        if (priorityOptions) {
            priorityOptions.classList.toggle("priority-invalid", !valid);
        }

        return valid;
    }

    function updatePriorityLimit(changedCheckbox) {
        const selected = priorityCheckboxes.filter(
            (checkbox) => checkbox.checked
        );

        if (selected.length > 3) {
            changedCheckbox.checked = false;
            showMessage(
                "Please select no more than three priorities.",
                "error"
            );
        }

        updateOtherIssue();
        validatePriorities();
    }

    function validatePhone() {
        const value = phoneInput.value.trim();

        if (!value) {
            phoneInput.setCustomValidity("");
            return true;
        }

        const digits = value.replace(/\D/g, "");
        const valid =
            /^[+\d\s().-]+$/.test(value) &&
            digits.length >= 7 &&
            digits.length <= 15;

        phoneInput.setCustomValidity(
            valid ? "" : "Please enter a valid phone number."
        );

        return valid;
    }

    function validateOptionalContact() {
        emailInput.setCustomValidity("");

        if (emailInput.value.trim() && !emailInput.checkValidity()) {
            emailInput.setCustomValidity(
                "Please enter a valid email address."
            );
        }

        return validatePhone() && emailInput.checkValidity();
    }

    areaSelect.addEventListener("change", () => {
        updateOtherArea();
        clearMessage();
    });

    priorityCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            updatePriorityLimit(checkbox);
            clearMessage();
        });
    });

    phoneInput.addEventListener("input", validatePhone);

    emailInput.addEventListener("input", () => {
        emailInput.setCustomValidity("");
    });

    form.addEventListener("input", clearMessage);
    form.addEventListener("change", clearMessage);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        updateOtherArea();
        updateOtherIssue();

        const prioritiesValid = validatePriorities();
        const contactValid = validateOptionalContact();
        const fieldsValid = form.checkValidity();

        form.classList.add("was-validated");

        if (!fieldsValid || !prioritiesValid || !contactValid) {
            showMessage(
                "Please correct the highlighted fields before submitting.",
                "error"
            );

            const firstInvalid = form.querySelector(":invalid");

            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

            return;
        }

        if (
            contactConsent.checked &&
            !phoneInput.value.trim() &&
            !emailInput.value.trim()
        ) {
            showMessage(
                "For follow-up, please provide a phone number or email, or uncheck contact permission.",
                "error"
            );
            contactConsent.focus();
            return;
        }

        if (
            !SUPABASE_PUBLISHABLE_KEY ||
            SUPABASE_PUBLISHABLE_KEY.startsWith("PASTE_")
        ) {
            showMessage(
                "Supabase publishable key is missing. Check survey.js.",
                "error"
            );
            return;
        }

        const payload = {
            fullName: fullName.value.trim(),
            area: areaSelect.value,
            otherArea: otherAreaInput.value.trim(),
            profession: profession.value,
            organization: organization.value.trim(),
            priorities: priorityCheckboxes
                .filter((checkbox) => checkbox.checked)
                .map((checkbox) => checkbox.value),
            otherIssue: otherIssueInput.value.trim(),
            issueDetails: issueDetails.value.trim(),
            solution: solution.value.trim(),
            phone: phoneInput.value.trim(),
            email: emailInput.value.trim(),
            contactConsent: contactConsent.checked
        };

        const originalButtonText = submitButton
            ? submitButton.textContent
            : "";

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        }

        try {
            const response = await fetch(SUPABASE_FUNCTION_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_PUBLISHABLE_KEY
                },
                body: JSON.stringify(payload)
            });

            let result = {};

            try {
                result = await response.json();
            } catch {
                // Response was not valid JSON.
            }

            if (!response.ok || result.success !== true) {
                throw new Error(
                    result.error ||
                    `Submission failed (HTTP ${response.status}).`
                );
            }

            showMessage(
                "Thank you! Your survey response has been submitted successfully.",
                "success"
            );

            form.reset();
            form.classList.remove("was-validated");

            updateOtherArea();
            updateOtherIssue();
            validatePriorities();
            validateOptionalContact();

        } catch (error) {
            console.error("Survey submission failed.");

            showMessage(
                error instanceof Error
                    ? error.message
                    : "Network error. Please try again.",
                "error"
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    originalButtonText || "Submit Survey";
            }
        }
    });

    updateOtherArea();
    updateOtherIssue();
    validatePriorities();
});
