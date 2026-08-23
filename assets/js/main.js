(function () {
  "use strict";

  const config = window.UPILATE_CONFIG || {};
  const isConfigured = (value) => value && !String(value).includes("YOUR_");

  // Add canonical and factual brand markup only after the final domain is configured.
  if (isConfigured(config.siteUrl)) {
    try {
      const siteBase = new URL(config.siteUrl);
      if (!siteBase.pathname.endsWith("/")) siteBase.pathname += "/";
      siteBase.search = "";
      siteBase.hash = "";

      const fileName = window.location.pathname.split("/").filter(Boolean).pop() || "index.html";
      const canonicalUrl = new URL(fileName === "index.html" ? "" : fileName, siteBase).href;
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = canonicalUrl;

      let openGraphUrl = document.querySelector('meta[property="og:url"]');
      if (!openGraphUrl) {
        openGraphUrl = document.createElement("meta");
        openGraphUrl.setAttribute("property", "og:url");
        document.head.appendChild(openGraphUrl);
      }
      openGraphUrl.content = canonicalUrl;

      if (fileName === "index.html" && !document.querySelector("[data-site-schema]")) {
        const schema = document.createElement("script");
        schema.type = "application/ld+json";
        schema.dataset.siteSchema = "";
        schema.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${siteBase.href}#organization`,
              name: "UPILATE",
              url: siteBase.href,
              logo: new URL("assets/images/upilate-logo.png", siteBase).href,
              description: "B2B supply of commercial Pilates equipment, aerial yoga products and custom grip socks for studios and distributors.",
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+86 131 7559 2862",
                contactType: "sales",
                availableLanguage: ["English", "Chinese"]
              }
            },
            {
              "@type": "WebSite",
              "@id": `${siteBase.href}#website`,
              url: siteBase.href,
              name: "UPILATE",
              publisher: { "@id": `${siteBase.href}#organization` }
            }
          ]
        });
        document.head.appendChild(schema);
      }
    } catch (error) {
      // Keep local previews and unconfigured copies free of placeholder canonicals.
    }
  }

  // Mobile navigation
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
    });
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      });
    });
  }

  // Header shadow after scroll
  const header = document.querySelector("[data-header]");
  const updateHeader = () => header && header.classList.toggle("is-scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  // WhatsApp links with useful pre-filled context
  function buildWhatsAppMessage(element) {
    const product = element.dataset.waProduct || "UPILATE studio equipment";
    const intent = element.dataset.waIntent || "a quotation";
    const page = document.title.replace(/\s*\|\s*UPILATE.*$/i, "");
    return [
      `Hello UPILATE, I'm interested in ${product}.`,
      `I would like ${intent}.`,
      "",
      "Country / region:",
      "Business type:",
      "Required quantity:",
      "Target delivery date:",
      "",
      `Source page: ${page}`
    ].join("\n");
  }

  document.querySelectorAll("[data-whatsapp]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (isConfigured(config.whatsappNumber)) {
        const number = String(config.whatsappNumber).replace(/\D/g, "");
        const url = `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(button))}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const inquiry = document.querySelector("#inquiry");
        if (inquiry) inquiry.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast("WhatsApp is ready to connect after the number is added. Please use the inquiry form for now.");
      }
    });
  });

  // Web3Forms configuration and submission
  document.querySelectorAll("[data-inquiry-form]").forEach((form) => {
    const accessKey = form.querySelector('input[name="access_key"]');
    if (accessKey && isConfigured(config.web3formsAccessKey)) {
      accessKey.value = config.web3formsAccessKey;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedProduct = params.get("product");
    const requestedPackage = params.get("package");
    const messageField = form.querySelector('[name="message"]');
    const quantityField = form.querySelector('[name="quantity"]');
    if (requestedProduct && messageField && !messageField.value) {
      messageField.value = `I would like specifications and a quotation for: ${requestedProduct.replace(/-/g, " ")}.`;
    }
    if (requestedPackage && quantityField && !quantityField.value) {
      quantityField.value = `${requestedPackage} reformers`;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      const submit = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);
      formData.set("access_key", config.web3formsAccessKey || "");
      formData.set("from_name", "UPILATE Website Inquiry");
      formData.set("subject", `New ${formData.get("business_type") || "B2B"} inquiry from ${formData.get("country") || "website"}`);
      formData.set("page_url", window.location.href);

      if (!isConfigured(config.web3formsAccessKey)) {
        if (status) {
          status.textContent = "The inquiry form is built and ready. Add your Web3Forms access key in assets/js/site-config.js before publishing.";
          status.className = "form-status is-note";
        }
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.dataset.originalText = submit.textContent;
        submit.textContent = "Sending…";
      }
      if (status) {
        status.textContent = "";
        status.className = "form-status";
      }

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: formData
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Submission failed");
        form.reset();
        if (accessKey) accessKey.value = config.web3formsAccessKey;
        if (status) {
          status.textContent = "Thank you. Your request has been sent successfully.";
          status.className = "form-status is-success";
        }
        trackEvent("generate_lead", { form_name: form.dataset.formName || "b2b_inquiry" });
      } catch (error) {
        if (status) {
          status.textContent = "We couldn't send the form just now. Please try again or contact us on WhatsApp.";
          status.className = "form-status is-error";
        }
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = submit.dataset.originalText || "Send inquiry";
        }
      }
    });
  });

  // Product filters
  const filterButtons = document.querySelectorAll("[data-filter]");
  const productCards = document.querySelectorAll("[data-category]");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      const filter = button.dataset.filter;
      productCards.forEach((card) => {
        const visible = filter === "all" || card.dataset.category === filter;
        card.hidden = !visible;
      });
    });
  });

  // FAQ accordions
  document.querySelectorAll(".faq-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const open = item.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
    });
  });

  // Lightweight reveal animation with accessibility fallback
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
  } else {
    document.querySelectorAll("[data-reveal]").forEach((element) => element.classList.add("is-visible"));
  }

  // GA4: loaded only after a real Measurement ID is supplied.
  if (/^G-[A-Z0-9]+$/i.test(config.ga4MeasurementId || "")) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4MeasurementId)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", config.ga4MeasurementId);
  }

  function trackEvent(name, parameters) {
    if (typeof window.gtag === "function") window.gtag("event", name, parameters || {});
  }

  function showToast(message) {
    let toast = document.querySelector("[data-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.dataset.toast = "";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => toast.classList.remove("is-visible"), 4500);
  }
})();
