(function initializeFormRuntime(global) {
  "use strict";

  const app = global.HealthApp = global.HealthApp || {};

  function create(options) {
    const {
      form,
      completeButton,
      printButton,
      completionStatus,
      validationMessage,
      actionBarSelector = ".action-bar"
    } = options;

    if (!form || !completeButton || !printButton || !completionStatus || !validationMessage) {
      throw new Error("建立表單執行環境時缺少必要的 DOM 元素。");
    }

    let isComplete = false;
    let isImeComposing = false;

    function getRadioValue(name) {
      return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
    }

    function getValue(id) {
      return document.getElementById(id)?.value.trim() || "";
    }

    function numbersOnly(input) {
      input.value = input.value.replace(/[^0-9]/g, "");
    }

    function setError(fieldName, message) {
      const field = form.querySelector(`[data-field="${fieldName}"]`);
      if (!field) return;
      field.classList.toggle("has-error", Boolean(message));
      const error = field.querySelector(".field-error");
      if (error) error.textContent = message;
    }

    function clearFieldErrorForElement(element) {
      const field = element.closest?.("[data-field]");
      if (!field) return;
      field.classList.remove("has-error");
      const error = field.querySelector(".field-error");
      if (error) error.textContent = "";
    }

    function clearValidationPresentation() {
      validationMessage.textContent = "";
      validationMessage.classList.remove("is-visible");
      form.querySelectorAll(".field.has-error").forEach(field => {
        field.classList.remove("has-error");
        const error = field.querySelector(".field-error");
        if (error) error.textContent = "";
      });
    }

    function ensureKeyboardFocusVisible(target) {
      global.requestAnimationFrame(() => {
        const focusArea = target.closest(".option-card, .inline-subfield") || target;
        const focusRect = focusArea.getBoundingClientRect();
        const actionBar = document.querySelector(actionBarSelector);
        const actionRect = actionBar?.getBoundingClientRect();
        const visibleTop = 16;
        const visibleBottom = actionRect && actionRect.top > 0 && actionRect.top < global.innerHeight
          ? actionRect.top - 16
          : global.innerHeight - 16;

        if (focusRect.top < visibleTop || focusRect.bottom > visibleBottom) {
          focusArea.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      });
    }

    function presentFirstValidationError(fieldName) {
      const firstField = form.querySelector(`[data-field="${fieldName}"]`);
      if (!firstField) return;

      const message = firstField.querySelector(".field-error")?.textContent || "請完成此欄位。";
      form.querySelectorAll(".field.has-error").forEach(field => {
        if (field === firstField) return;
        field.classList.remove("has-error");
        const error = field.querySelector(".field-error");
        if (error) error.textContent = "";
      });

      validationMessage.textContent = message;
      validationMessage.classList.add("is-visible");

      const focusTarget = firstField.querySelector("input:checked") ||
        firstField.querySelector("input, textarea");
      if (focusTarget) {
        focusTarget.focus({ preventScroll: true });
        ensureKeyboardFocusVisible(focusTarget);
      }
    }

    function rocDateParts(prefix) {
      return {
        year: Number(getValue(`${prefix}Year`)),
        month: Number(getValue(`${prefix}Month`)),
        day: Number(getValue(`${prefix}Day`))
      };
    }

    function isValidRocDate(parts) {
      if (!Number.isInteger(parts.year) || parts.year < 1 ||
          !Number.isInteger(parts.month) || parts.month < 1 || parts.month > 12 ||
          !Number.isInteger(parts.day) || parts.day < 1 || parts.day > 31) {
        return false;
      }
      const westernYear = parts.year + 1911;
      const date = new Date(westernYear, parts.month - 1, parts.day);
      return date.getFullYear() === westernYear &&
        date.getMonth() === parts.month - 1 &&
        date.getDate() === parts.day;
    }

    function rocDateToDate(parts) {
      return new Date(parts.year + 1911, parts.month - 1, parts.day);
    }

    function calculateCurrentAge(birthDate) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 ||
          (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
      }
      return age;
    }

    function setCompletionState(complete) {
      clearValidationPresentation();
      isComplete = complete;
      completionStatus.textContent = complete ? "表單已完成" : "尚未完成";
      completionStatus.classList.toggle("is-complete", complete);
      printButton.disabled = !complete;
    }

    function invalidateCompletion() {
      if (isComplete) setCompletionState(false);
    }

    function isKeyboardTargetVisible(element) {
      return !element.disabled && element.offsetParent !== null &&
        global.getComputedStyle(element).visibility !== "hidden";
    }

    function getKeyboardNavigationTargets() {
      const elements = [...form.querySelectorAll("input:not([type='hidden']), textarea")]
        .filter(isKeyboardTargetVisible);
      const targets = [];
      const radioGroups = new Set();

      elements.forEach(element => {
        if (element instanceof HTMLInputElement && element.type === "radio") {
          if (radioGroups.has(element.name)) return;
          radioGroups.add(element.name);
          const group = elements.filter(candidate =>
            candidate instanceof HTMLInputElement &&
            candidate.type === "radio" &&
            candidate.name === element.name
          );
          targets.push(group.find(candidate => candidate.checked) || group[0]);
          return;
        }
        targets.push(element);
      });

      targets.push(completeButton);
      return targets;
    }

    function moveKeyboardFocus(currentTarget, direction) {
      const targets = getKeyboardNavigationTargets();
      let currentIndex = targets.indexOf(currentTarget);

      if (currentTarget instanceof HTMLInputElement && currentTarget.type === "radio") {
        currentIndex = targets.findIndex(target =>
          target instanceof HTMLInputElement &&
          target.type === "radio" &&
          target.name === currentTarget.name
        );
      }

      if (currentIndex < 0) return;
      const nextIndex = Math.max(0, Math.min(targets.length - 1, currentIndex + direction));
      if (nextIndex === currentIndex) return;
      const nextTarget = targets[nextIndex];

      if (nextTarget instanceof HTMLInputElement &&
          nextTarget.type === "radio" &&
          !getRadioValue(nextTarget.name)) {
        nextTarget.checked = true;
        nextTarget.dispatchEvent(new Event("input", { bubbles: true }));
        nextTarget.dispatchEvent(new Event("change", { bubbles: true }));
      }

      nextTarget.focus({ preventScroll: true });
      ensureKeyboardFocusVisible(nextTarget);
    }

    function installKeyboardNavigation() {
      form.addEventListener("submit", event => {
        event.preventDefault();
        if (isImeComposing) return;
        const activeTarget = document.activeElement;
        if (activeTarget instanceof HTMLInputElement || activeTarget instanceof HTMLTextAreaElement) {
          moveKeyboardFocus(activeTarget, 1);
        }
      });

      form.addEventListener("compositionstart", () => {
        isImeComposing = true;
      });

      form.addEventListener("compositionend", () => {
        isImeComposing = false;
      });

      form.addEventListener("beforeinput", event => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
        if (isImeComposing || event.isComposing) return;
        if (event.inputType !== "insertLineBreak" && event.inputType !== "insertParagraph") return;
        event.preventDefault();
        moveKeyboardFocus(target, 1);
      });

      form.addEventListener("keydown", event => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
        if (isImeComposing || event.isComposing || event.keyCode === 229) return;

        if (target instanceof HTMLInputElement && target.type === "radio") {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveKeyboardFocus(target, event.key === "ArrowDown" ? 1 : -1);
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (!target.checked) {
              target.checked = true;
              target.dispatchEvent(new Event("input", { bubbles: true }));
              target.dispatchEvent(new Event("change", { bubbles: true }));
            }
            moveKeyboardFocus(target, 1);
          }
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          moveKeyboardFocus(target, 1);
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveKeyboardFocus(target, 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveKeyboardFocus(target, -1);
        }
      });

      form.querySelectorAll("input:not([type='radio'])").forEach(input => {
        input.setAttribute("enterkeyhint", "next");
      });
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    return Object.freeze({
      getRadioValue,
      getValue,
      numbersOnly,
      setError,
      clearFieldErrorForElement,
      clearValidationPresentation,
      presentFirstValidationError,
      rocDateParts,
      isValidRocDate,
      rocDateToDate,
      calculateCurrentAge,
      setCompletionState,
      invalidateCompletion,
      ensureKeyboardFocusVisible,
      moveKeyboardFocus,
      installKeyboardNavigation,
      escapeHtml,
      isComplete: () => isComplete
    });
  }

  app.formRuntime = Object.freeze({ create });
})(window);
