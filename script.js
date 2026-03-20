// Smooth anchor scrolling for in-page links.
document.addEventListener("click", (e) => {
  const target = e.target instanceof Element ? e.target.closest("a[href^='#']") : null;
  if (!target) return;

  const href = target.getAttribute("href");
  if (!href) return;
  // На file:// переход по "#" может давать security warnings — просто гасим дефолт.
  if (href === "#") {
    e.preventDefault();
    return;
  }
  // `#order` используем как хук для модалок, прокрутку не делаем.
  if (href === "#order") return;

  const el = document.querySelector(href);
  if (!(el instanceof HTMLElement)) return;

  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
});

const burger = document.querySelector(".header__burger");
const mobileMenu = document.querySelector("#mobile-menu");
const mobileBackdrop = document.querySelector(".mobile-menu__backdrop");
const header = document.querySelector(".header");
const catalogMoreBtn = document.querySelector("#catalog-more");

let isCatalogExtrasShown = false;

function setMenuOpen(next) {
  document.body.classList.toggle("is-menu-open", next);
  if (burger) burger.setAttribute("aria-expanded", String(next));

  if (mobileMenu) {
    // При закрытии: сначала блокируем фокус внутри меню, затем переносим фокус наружу,
    // и только потом скрываем меню для ассистивных технологий.
    if (!next) {
      mobileMenu.setAttribute("inert", "");

      const active = document.activeElement;
      if (active instanceof HTMLElement && mobileMenu.contains(active)) {
        active.blur();
      }
      // Если сейчас открыта модалка заявки — не переводим фокус на бургер.
      if (!document.querySelector(".order-modal.is-open")) {
        burger?.focus();
      }

      requestAnimationFrame(() => {
        mobileMenu.setAttribute("aria-hidden", "true");
      });
      return;
    }

    // При открытии: раскрываем и разрешаем фокус
    mobileMenu.removeAttribute("aria-hidden");
    mobileMenu.removeAttribute("inert");
  }
}

burger?.addEventListener("click", () => {
  const isOpen = document.body.classList.contains("is-menu-open");
  setMenuOpen(!isOpen);
});

mobileBackdrop?.addEventListener("click", () => setMenuOpen(false));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenuOpen(false);
});

document.addEventListener("click", (e) => {
  const link = e.target instanceof Element ? e.target.closest(".mobile-menu a[href^='#']") : null;
  if (!link) return;
  setMenuOpen(false);
});

let scrollTicking = false;
function updateHeaderScrolled() {
  const isScrolled = window.scrollY > 0;
  header?.classList.toggle("is-scrolled", isScrolled);
  scrollTicking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateHeaderScrolled);
  },
  { passive: true }
);

updateHeaderScrolled();

// Catalog filter pressed-state (visual). Filtering can be added later.
const filterChips = Array.from(document.querySelectorAll(".catalog__filters [data-filter]"));
const catalogCards = Array.from(document.querySelectorAll(".catalog-card[data-category]"));

function applyCatalogFilter(nextFilter) {
  filterChips.forEach((b) => {
    const isActive = b.getAttribute("data-filter") === nextFilter;
    b.classList.toggle("chip--active", isActive);
    b.setAttribute("aria-selected", String(isActive));
  });

  const isAll = nextFilter === "all";
  catalogCards.forEach((card) => {
    const isExtra = card.classList.contains("catalog-card--extra");
    if (isExtra && !isCatalogExtrasShown) {
      card.hidden = true;
      return;
    }
    const cardCategory = card.getAttribute("data-category");
    const shouldShow = isAll || cardCategory === nextFilter;
    card.hidden = !shouldShow;
  });
}

filterChips.forEach((btn) => {
  btn.addEventListener("click", () => {
    const nextFilter = btn.getAttribute("data-filter") || "all";
    applyCatalogFilter(nextFilter);
  });
});

// Initial filter state: "Все" is active by default.
const initialActiveChip = filterChips.find((b) => b.classList.contains("chip--active"));
applyCatalogFilter(initialActiveChip?.getAttribute("data-filter") || "all");

catalogMoreBtn?.addEventListener("click", () => {
  isCatalogExtrasShown = true;

  const activeChip = filterChips.find((b) => b.classList.contains("chip--active"));
  applyCatalogFilter(activeChip?.getAttribute("data-filter") || "all");

  catalogMoreBtn.disabled = true;
  catalogMoreBtn.textContent = "Работы показаны";
});

// ===== QUIZ =====
(function () {
  const TOTAL_STEPS = 6;
  const PROGRESS_STEPS = 5; // "Шаг X из 5" — последний (контакты) = финальный

  let currentStep = 1;
  const answers = {};

  const stepEls      = document.querySelectorAll(".quiz__step");
  const progressFill = document.getElementById("quiz-progress-fill");
  const stepLabel    = document.getElementById("quiz-step-current");
  const backBtn      = document.getElementById("quiz-back");
  const nextBtn      = document.getElementById("quiz-next");
  const successEl    = document.getElementById("quiz-success");
  const stepsWrap    = document.getElementById("quiz-steps");
  const navEl        = document.getElementById("quiz-nav");
  const progressEl   = document.getElementById("quiz-progress");

  if (!stepEls.length || !progressFill) return;

  // ── UI update ──────────────────────────────────────────────────
  function updateUI() {
    stepEls.forEach((el, i) => {
      el.classList.toggle("is-active", i + 1 === currentStep);
    });

    // Progress bar: linear 0→100 over all steps
    const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    progressFill.style.width = Math.max(pct, 4) + "%";
    progressFill.closest("[role=progressbar]") &&
      progressFill.closest("[role=progressbar]").setAttribute("aria-valuenow", currentStep);

    // Progress label: cap at PROGRESS_STEPS
    const displayStep = Math.min(currentStep, PROGRESS_STEPS);
    if (stepLabel) stepLabel.textContent = displayStep;

    // Back button
    backBtn.hidden = currentStep === 1;

    // Next button label
    if (currentStep === TOTAL_STEPS) {
      nextBtn.textContent = "Получить скидку";
    } else if (currentStep === TOTAL_STEPS - 1) {
      nextBtn.textContent = "Подобрать варианты";
    } else {
      nextBtn.textContent = "Продолжить";
    }
  }

  // ── Navigation ─────────────────────────────────────────────────
  function goTo(step) {
    if (step < 1 || step > TOTAL_STEPS) return;

    const outEl = document.querySelector(".quiz__step.is-active");
    if (outEl) {
      outEl.classList.add("is-leaving");
      outEl.addEventListener("animationend", () => outEl.classList.remove("is-leaving"), { once: true });
    }

    currentStep = step;
    updateUI();
  }

  function goNext() {
    if (currentStep < TOTAL_STEPS) {
      goTo(currentStep + 1);
    } else {
      submitQuiz();
    }
  }

  function goBack() {
    goTo(currentStep - 1);
  }

  // ── Submit ──────────────────────────────────────────────────────
  function submitQuiz() {
    const nameInput  = document.getElementById("quiz-name");
    const phoneInput = document.getElementById("quiz-phone");
    let valid = true;

    [nameInput, phoneInput].forEach((inp) => {
      if (!inp) return;
      const empty = !inp.value.trim();
      inp.classList.toggle("is-error", empty);
      if (empty) valid = false;
      inp.addEventListener("input", () => inp.classList.remove("is-error"), { once: true });
    });

    if (!valid) return;

    // Hide quiz content, show success
    [stepsWrap, progressEl, navEl].forEach((el) => {
      if (el) el.style.display = "none";
    });
    const topEl = document.querySelector(".quiz__top");
    if (topEl) topEl.style.display = "none";

    if (successEl) successEl.classList.add("is-visible");

    // Optional: send answers somewhere
    console.log("Quiz answers:", { ...answers, wishes: document.getElementById("quiz-wishes")?.value });
  }

  // ── Option selection ───────────────────────────────────────────
  stepEls.forEach((stepEl) => {
    const options = stepEl.querySelectorAll(".quiz__option");
    const stepNum = parseInt(stepEl.dataset.step, 10);

    options.forEach((opt) => {
      // Skip date option — handled separately
      if (opt.classList.contains("quiz__option--date")) return;

      opt.addEventListener("click", () => {
        // Deselect siblings
        options.forEach((o) => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        answers[stepNum] = opt.dataset.value;

        // Auto-advance on steps 1–4 (photo + list options)
        if (stepNum <= 4) {
          setTimeout(goNext, 300);
        }
      });
    });
  });

  // ── Date option ────────────────────────────────────────────────
  const dateOpt   = document.querySelector(".quiz__option--date");
  const dateInput = document.getElementById("quiz-date-input");
  const dateDisp  = document.getElementById("quiz-date-display");

  if (dateOpt && dateInput) {
    // On mobile the hidden input covers the whole option area.
    // Open native date picker here, then prevent bubbling.
    dateInput.addEventListener("click", (e) => {
      e.stopPropagation();
      try {
        dateInput.showPicker();
      } catch (_) {
        dateInput.focus();
      }
    });

    // Clicking the option opens the date picker
    dateOpt.addEventListener("click", () => {
      try {
        dateInput.showPicker();
      } catch (_) {
        dateInput.focus();
      }
    });

    dateInput.addEventListener("change", () => {
      const step4 = document.querySelector('[data-step="4"]');
      if (step4) step4.querySelectorAll(".quiz__option").forEach((o) => o.classList.remove("is-selected"));
      dateOpt.classList.add("is-selected");
      answers[4] = dateInput.value;

      if (dateDisp && dateInput.value) {
        const d = new Date(dateInput.value + "T00:00:00");
        dateDisp.textContent = "— " + d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      }
    });
  }

  // ── Nav buttons ────────────────────────────────────────────────
  nextBtn.addEventListener("click", goNext);
  backBtn.addEventListener("click", goBack);

  // Init
  updateUI();
})();

// Process line animation
const processLine = document.querySelector(".process__line");
if (processLine) {
  const lineObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-drawn");
        lineObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.4, rootMargin: "0px 0px -5% 0px" }
  );
  lineObserver.observe(processLine);
}

// Reveal on scroll
const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
if (revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );

  revealEls.forEach((el) => io.observe(el));
}

// ===== Reviews lightbox =====
(function () {
  const lightbox = document.getElementById("reviews-lightbox");
  if (!lightbox) return;

  const imageEl = document.getElementById("reviews-lightbox-image");
  const backdropBtn = lightbox.querySelector(".reviews-lightbox__backdrop");
  const closeBtn = lightbox.querySelector(".reviews-lightbox__close");
  const items = Array.from(document.querySelectorAll(".reviews__item"));
  let lastActive = null;

  function openFromItem(item) {
    const img = item.querySelector("img");
    if (!img || !imageEl) return;

    imageEl.src = img.currentSrc || img.src;
    imageEl.alt = img.alt || "";

    lastActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    closeBtn?.focus();
  }

  function close() {
    if (!lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (lastActive && document.body.contains(lastActive)) {
      lastActive.focus();
    }
  }

  items.forEach((item) => {
    item.addEventListener("click", () => openFromItem(item));
  });

  backdropBtn?.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
    }
  });
})();

// ===== CTA form =====
(function () {
  const form = document.getElementById("cta-form");
  const successEl = document.getElementById("cta-success");
  if (!form) return;

  const nameInput  = form.querySelector("#cta-name");
  const phoneInput = form.querySelector("#cta-phone");
  const typeSelect = form.querySelector("#cta-type");

  function markError(el) {
    el.classList.add("is-error");
    el.addEventListener("input", () => el.classList.remove("is-error"), { once: true });
    el.addEventListener("change", () => el.classList.remove("is-error"), { once: true });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let valid = true;

    if (!nameInput.value.trim()) { markError(nameInput); valid = false; }
    if (!phoneInput.value.trim()) { markError(phoneInput); valid = false; }

    if (!valid) {
      (form.querySelector(".is-error"))?.focus();
      return;
    }

    // Скрываем форму, показываем успех
    form.style.display = "none";
    if (successEl) successEl.classList.add("is-visible");

    console.log("CTA form:", {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      type: typeSelect?.value,
      comment: form.querySelector("#cta-comment")?.value.trim(),
    });
  });
})();

// ===== Order modals (Обсудить заказ / Хочу такую) =====
(function () {
  const requestModal = document.getElementById("order-modal-request");
  const interestModal = document.getElementById("order-modal-interest");
  if (!requestModal || !interestModal) return;

  const requestForm = document.getElementById("order-request-form");
  const requestSuccess = document.getElementById("order-request-success");
  const requestCloseBtn = requestModal.querySelector(".order-modal__close");

  const interestForm = document.getElementById("order-interest-form");
  const interestSuccess = document.getElementById("order-interest-success");
  const interestCloseBtn = interestModal.querySelector(".order-modal__close");
  const interestTitleEl = document.getElementById("order-interest-title");

  let lastActive = null;

  function openModal(modal, closeBtn) {
    lastActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  }

  function closeModal(modal, closeBtn) {
    if (!modal.classList.contains("is-open")) return;

    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (active && modal.contains(active)) active.blur();

    modal.classList.remove("is-open");
    document.body.style.overflow = "";

    requestAnimationFrame(() => {
      modal.setAttribute("aria-hidden", "true");
      if (lastActive && document.body.contains(lastActive)) lastActive.focus();
      else closeBtn?.focus();
    });
  }

  function resetForm(form, successEl) {
    if (!form) return;
    const wrap = form.closest(".cta__form-wrap");
    const header = wrap?.querySelector(".cta__form-header");
    if (header) header.style.display = "";
    form.style.display = "";
    form.reset();
    form.querySelectorAll(".is-error").forEach((el) => el.classList.remove("is-error"));
    if (successEl) successEl.classList.remove("is-visible");
  }

  // Request submit
  if (requestForm) {
    requestForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = requestForm.querySelector("#order-request-name");
      const phoneInput = requestForm.querySelector("#order-request-phone");

      let valid = true;
      if (!nameInput.value.trim()) {
        nameInput.classList.add("is-error");
        valid = false;
      }
      if (!phoneInput.value.trim()) {
        phoneInput.classList.add("is-error");
        valid = false;
      }

      if (!valid) {
        requestForm.querySelector(".is-error")?.focus();
        return;
      }

      const wrap = requestForm.closest(".cta__form-wrap");
      const headerEl = wrap?.querySelector(".cta__form-header");
      if (headerEl) headerEl.style.display = "none";
      requestForm.style.display = "none";
      if (requestSuccess) requestSuccess.classList.add("is-visible");
    });
  }

  if (interestForm) {
    interestForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = interestForm.querySelector("#order-interest-name");
      const phoneInput = interestForm.querySelector("#order-interest-phone");

      let valid = true;
      if (!nameInput.value.trim()) {
        nameInput.classList.add("is-error");
        valid = false;
      }
      if (!phoneInput.value.trim()) {
        phoneInput.classList.add("is-error");
        valid = false;
      }

      if (!valid) {
        interestForm.querySelector(".is-error")?.focus();
        return;
      }

      const wrap = interestForm.closest(".cta__form-wrap");
      const headerEl = wrap?.querySelector(".cta__form-header");
      if (headerEl) headerEl.style.display = "none";
      interestForm.style.display = "none";
      if (interestSuccess) interestSuccess.classList.add("is-visible");
    });
  }

  // Close handlers
  requestModal.querySelector(".order-modal__backdrop")?.addEventListener("click", () => closeModal(requestModal, requestCloseBtn));
  interestModal.querySelector(".order-modal__backdrop")?.addEventListener("click", () => closeModal(interestModal, interestCloseBtn));
  requestCloseBtn?.addEventListener("click", () => closeModal(requestModal, requestCloseBtn));
  interestCloseBtn?.addEventListener("click", () => closeModal(interestModal, interestCloseBtn));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (requestModal.classList.contains("is-open")) closeModal(requestModal, requestCloseBtn);
    if (interestModal.classList.contains("is-open")) closeModal(interestModal, interestCloseBtn);
  });

  // Open handlers for all #order links
  const orderLinks = Array.from(document.querySelectorAll('a[href="#order"]'));
  orderLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const card = a.closest(".catalog-card");
      e.preventDefault();

      if (card) {
        const title = card.querySelector(".catalog-card__title")?.textContent?.trim() || "выбранный вариант";
        if (interestTitleEl) interestTitleEl.textContent = title;
        resetForm(interestForm, interestSuccess);
        openModal(interestModal, interestCloseBtn);
        return;
      }

      resetForm(requestForm, requestSuccess);
      openModal(requestModal, requestCloseBtn);
    });
  });
})();

