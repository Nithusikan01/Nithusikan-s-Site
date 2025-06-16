/*==================== MENU SHOW Y HIDDEN ====================*/
const navMenu = document.getElementById("nav-menu"),
  navToggle = document.getElementById("nav-toggle"),
  navClose = document.getElementById("nav-close");

/*===== MENU SHOW =====*/
if (navToggle) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.add("show-menu");
  });
}

/*===== MENU HIDDEN =====*/
if (navClose) {
  navClose.addEventListener("click", () => {
    navMenu.classList.remove("show-menu");
  });
}

/*==================== REMOVE MENU MOBILE ====================*/
const navLink = document.querySelectorAll(".nav__link");

function linkAction() {
  navMenu.classList.remove("show-menu");
}
navLink.forEach((n) => n.addEventListener("click", linkAction));

/*==================== ACCORDION SKILLS ====================*/
const skillsContent = document.getElementsByClassName("skills__content"),
  skillsHeader = document.querySelectorAll(".skills__header");

function toggleSkills() {
  let itemClass = this.parentNode.className;

  for (let i = 0; i < skillsContent.length; i++) {
    skillsContent[i].className = "skills__content skills__close";
  }
  if (itemClass === "skills__content skills__close") {
    this.parentNode.className = "skills__content skills__open";
  }
}

skillsHeader.forEach((el) => {
  el.addEventListener("click", toggleSkills);
});

/*==================== QUALIFICATION TABS ====================*/
const tabs = document.querySelectorAll("[data-target]"),
  tabContents = document.querySelectorAll("[data-content]");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = document.querySelector(tab.dataset.target);

    tabContents.forEach((tabContent) => {
      tabContent.classList.remove("qualification__active");
    });
    target.classList.add("qualification__active");

    tabs.forEach((tab) => {
      tab.classList.remove("qualification__active");
    });
    tab.classList.add("qualification__active");
  });
});

/*==================== SERVICES MODAL ====================*/
const modalViews = document.querySelectorAll(".services__modal"),
  modalBtns = document.querySelectorAll(".services__button"),
  modalCloses = document.querySelectorAll(".services__modal-close");

let modal = function (modalClick) {
  modalViews[modalClick].classList.add("active-modal");
};

modalBtns.forEach((modalBtn, i) => {
  modalBtn.addEventListener("click", () => {
    modal(i);
  });
});

modalCloses.forEach((modalClose) => {
  modalClose.addEventListener("click", () => {
    modalViews.forEach((modalView) => {
      modalView.classList.remove("active-modal");
    });
  });
});

/*==================== PORTFOLIO SWIPER  ====================*/
let swiperPortfolio; // declare globally so we can re-init if needed
function initPortfolioSwiper() {
  if (swiperPortfolio) swiperPortfolio.destroy(true, true);
  swiperPortfolio = new Swiper(".portfolio__container", {
    cssMode: true,
    loop: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
  });
}

/*==================== CERTIFICATIONS SWIPER  ====================*/
let swiperCertification; // declare globally so we can re-init if needed
function initCertificationsSwiper() {
  if (swiperCertification) swiperCertification.destroy(true, true);
  swiperCertification = new Swiper(".certification__container", {
    cssMode: true,
    loop: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
  });
}

/*==================== TESTIMONIAL ====================*/
let swiperTestimonial = new Swiper(".testimonial__container", {
  loop: true,
  grabCursor: true,
  spaceBetween: 48,

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
    dynamicBullets: true,
  },

  breakpoints: {
    568: {
      slidesPerView: 2,
    },
  },
});

/*==================== SCROLL SECTIONS ACTIVE LINK ====================*/
const sections = document.querySelectorAll("section[id]");

function scrollActive() {
  const scrollY = window.pageYOffset;

  sections.forEach((current) => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 50;
    const sectionId = current.getAttribute("id");

    const navLink = document.querySelector(
      ".nav__menu a[href*=" + sectionId + "]"
    );
    if (!navLink) return;

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      navLink.classList.add("active-link");
    } else {
      navLink.classList.remove("active-link");
    }
  });
}
window.addEventListener("scroll", scrollActive);

/*==================== CHANGE BACKGROUND HEADER ====================*/
function scrollHeader() {
  const nav = document.getElementById("header");
  if (window.scrollY >= 80) nav.classList.add("scroll-header");
  else nav.classList.remove("scroll-header");
}
window.addEventListener("scroll", scrollHeader);

/*==================== SHOW SCROLL UP ====================*/
function scrollUp() {
  const scrollUp = document.getElementById("scroll-up");
  if (window.scrollY >= 560) scrollUp.classList.add("show-scroll");
  else scrollUp.classList.remove("show-scroll");
}
window.addEventListener("scroll", scrollUp);

/*==================== DARK LIGHT THEME ====================*/
const themeButton = document.getElementById("theme-button");
const darkTheme = "dark-theme";
const iconTheme = "uil-sun";

const selectedTheme = localStorage.getItem("selected-theme");
const selectedIcon = localStorage.getItem("selected-icon");

const getCurrentTheme = () =>
  document.body.classList.contains(darkTheme) ? "dark" : "light";
const getCurrentIcon = () =>
  themeButton.classList.contains(iconTheme) ? "uil-moon" : "uil-sun";

if (selectedTheme) {
  document.body.classList[selectedTheme === "dark" ? "add" : "remove"](
    darkTheme
  );
  themeButton.classList[selectedIcon === "uil-moon" ? "add" : "remove"](
    iconTheme
  );
}

themeButton.addEventListener("click", () => {
  document.body.classList.toggle(darkTheme);
  themeButton.classList.toggle(iconTheme);

  localStorage.setItem("selected-theme", getCurrentTheme());
  localStorage.setItem("selected-icon", getCurrentIcon());
});

/*==================== DYNAMIC PORTFOLIO FROM JSON ====================*/
fetch("packages/data/projects.json")
  .then((response) => response.json())
  .then((projects) => {
    const wrapper = document.getElementById("portfolio-wrapper");
    wrapper.innerHTML = ""; // Clear existing static content if any

    projects.forEach((project) => {
      const slide = document.createElement("div");
      slide.className = "portfolio__content grid swiper-slide";
      slide.innerHTML = `
        <img src="${project.image}" alt="${project.title}" class="portfolio__img" />

        <div class="portfolio_">
          <h3 class="portfolio__title">${project.title}</h3>
          <p class="portfolio__description">${project.description}</p>
          <div class="qualification__calendar">
            <i class="uil uil-calendar-alt"></i>
            ${project.duration}
          </div>
          <br />
          <a href="${project.link}" class="button button--flex button--small portfolio__button" target="_blank">
            ${project.linkText}
            <i class="uil uil-arrow-right button__icon"></i>
          </a>
        </div>
      `;
      wrapper.appendChild(slide);
    });

    // Initialize portfolio swiper after slides are added
    initPortfolioSwiper();
  })
  .catch((err) => console.error("Failed to load projects.json:", err));

/*==================== LOAD CERTIFICATIONS FROM JSON ====================*/
fetch("packages/data/certifications.json")
  .then((response) => response.json())
  .then((certifications) => {
    const container = document.getElementById("certification-wrapper");
    container.innerHTML = ""; // Clear existing static content if any

    certifications.forEach((cert) => {
      const slide = document.createElement("div");
      slide.className = "portfolio__content grid swiper-slide"; // Keep consistent styling
      slide.innerHTML = `
        <img src="${cert.image}" alt="${cert.title}" class="portfolio__img" />

        <div class="portfolio_">
          <h3 class="portfolio__title">${cert.title}</h3>
          <p class="portfolio__description">${cert.description}</p>
          <div class="qualification__calendar">
            <i class="uil uil-calendar-alt"></i>
            ${cert.year}
          </div>
          <br />
          <a href="${cert.link}" class="button button--flex button--small portfolio__button" target="_blank" rel="noopener noreferrer">
            View Certificate
            <i class="uil uil-arrow-right button__icon"></i>
          </a>
        </div>
      `;
      container.appendChild(slide);
    });

    // Initialize swiper for certifications if needed
    if (typeof initCertificationsSwiper === "function") {
      initCertificationsSwiper();
    }
  })
  .catch((err) => console.error("Failed to load certifications.json:", err));


/*==================== LOAD QUALIFICATIONS FROM JSON ====================*/
fetch("packages/data/qualifications.json")
  .then((res) => res.json())
  .then((qualifications) => {
    const container = document.getElementById("qualification-timeline");
    container.innerHTML = ""; // Clear static content

    qualifications.forEach((entry) => {
      const wrapper = document.createElement("div");
      wrapper.className = "qualification__data";

      const rounder = `<span class="qualification__rounder"></span>`;
      const line = entry.final ? "" : `<span class="qualification__line"></span>`;

      const content = `
        <div>
          <h3 class="qualification__title">${entry.title}</h3>
          <span class="qualification__subtitle">${entry.subtitle}</span>
          <div class="qualification__calendar">
            <i class="uil uil-calendar-alt"></i>
            ${entry.date}
          </div>
        </div>`;

      if (entry.direction === "right") {
        wrapper.innerHTML = `
          <div></div>
          <div>${rounder}${line}</div>
          ${content}`;
      } else {
        wrapper.innerHTML = `
          ${content}
          <div>${rounder}${line}</div>
          <div></div>`;
      }

      container.appendChild(wrapper);
    });
  })
  .catch((err) => console.error("Failed to load qualifications:", err));

// Certifications Swiper
var certificationsSwiper = new Swiper(".certifications-swiper", {
    cssMode: true,
    loop: true,
    navigation: {
        nextEl: ".certifications-button-next",
        prevEl: ".certifications-button-prev",
    },
    pagination: {
        el: ".certifications-pagination",
        clickable: true,
    },
    mousewheel: true,
    keyboard: true,
});
