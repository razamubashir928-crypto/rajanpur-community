
"use strict";

const SUPABASE_URL =
  "https://znrnikbsvasxhevhetey.supabase.co";

// Paste the same public sb_publishable_... key used by your survey.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2lsOrVLtzvaodAvHM8lkkQ_BngngJdk";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const loginPanel = $("loginPanel");
  const dashboardPanel = $("dashboardPanel");
  const loginForm = $("loginForm");
  const loginButton = $("loginButton");
  const loginMessage = $("loginMessage");
  const dashboardMessage = $("dashboardMessage");
  const logoutButton = $("logoutButton");
  const refreshButton = $("refreshButton");

  if (
    !window.supabase ||
    !SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")
  ) {
    loginMessage.textContent =
      "Setup incomplete. Add your Supabase public publishable key in js/admin.js.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  let requestNumber = 0;

  function showLogin(message = "") {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    loginMessage.textContent = message;
    dashboardMessage.textContent = "";
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
  }

  function setMessage(element, message, isError = true) {
    element.textContent = message;
    element.style.color = isError ? "#b42318" : "#168a7a";
  }

  function renderBars(container, items, labelKey, isPriority = false) {
    container.replaceChildren();

    if (!Array.isArray(items) || items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No responses recorded yet.";
      container.appendChild(empty);
      return;
    }

    const maxCount = Math.max(
      1,
      ...items.map((item) => Number(item.count) || 0)
    );

    items.forEach((item) => {
      const count = Math.max(0, Number(item.count) || 0);
      const wrapper = document.createElement("div");
      wrapper.className = "bar-item";

      const heading = document.createElement("div");
      heading.className = "bar-heading";

      const label = document.createElement("span");
      label.textContent = String(item[labelKey] || "Other");

      const value = document.createElement("span");
      value.className = "bar-value";
      value.textContent = String(count);

      heading.append(label, value);

      const track = document.createElement("div");
      track.className = "bar-track";
      track.setAttribute("role", "img");
      track.setAttribute(
        "aria-label",
        `${String(item[labelKey] || "Other")}: ${count} responses or selections`
      );

      const fill = document.createElement("div");
      fill.className = isPriority
        ? "bar-fill priority-fill"
        : "bar-fill";
      fill.style.width = `${(count / maxCount) * 100}%`;

      track.appendChild(fill);
      wrapper.append(heading, track);
      container.appendChild(wrapper);
    });
  }

  async function loadStats() {
    const currentRequest = ++requestNumber;

    refreshButton.disabled = true;
    setMessage(dashboardMessage, "Loading latest statistics…", false);

    try {
      const { data, error } = await client.rpc("get_admin_survey_stats");

      if (currentRequest !== requestNumber) return;

      if (error) {
        console.error("Admin statistics request failed:", error.message);
        setMessage(
          dashboardMessage,
          "Could not load statistics. Confirm that this account is authorized in admin_users and the SQL function was created."
        );
        return;
      }

      if (!data || typeof data !== "object") {
        setMessage(dashboardMessage, "The server returned invalid statistics.");
        return;
      }

      $("totalResponses").textContent =
        String(Number(data.total_responses) || 0);

      $("areaTotal").textContent =
        String(Array.isArray(data.areas) ? data.areas.length : 0);

      $("priorityTotal").textContent =
        String(Array.isArray(data.priorities) ? data.priorities.length : 0);

      renderBars($("areaChart"), data.areas, "area");
      renderBars(
        $("priorityChart"),
        Array.isArray(data.priorities) ? data.priorities.slice(0, 8) : [],
        "priority",
        true
      );

      setMessage(
        dashboardMessage,
        "Statistics loaded successfully. No personal response details are displayed.",
        false
      );
    } catch (error) {
      console.error("Admin dashboard request failed.");
      setMessage(
        dashboardMessage,
        "Unable to connect. Check your internet connection and try again."
      );
    } finally {
      refreshButton.disabled = false;
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    loginMessage.textContent = "Signing in…";

    try {
      const email = $("adminEmail").value.trim();
      const password = $("adminPassword").value;

      const { error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setMessage(
          loginMessage,
          "Sign-in failed. Check your credentials and try again."
        );
        return;
      }

      $("adminPassword").value = "";
      showDashboard();
      await loadStats();
    } catch {
      setMessage(loginMessage, "Unable to sign in. Please try again.");
    } finally {
      loginButton.disabled = false;
    }
  });

  refreshButton.addEventListener("click", loadStats);

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        setMessage(dashboardMessage, "Could not sign out. Please try again.");
        return;
      }

      showLogin("You have signed out.");
    } catch {
      setMessage(dashboardMessage, "Sign-out failed. Please try again.");
    } finally {
      logoutButton.disabled = false;
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      showLogin();
      return;
    }

    showDashboard();
  });

  async function initialize() {
    try {
      const { data, error } = await client.auth.getSession();

      if (error || !data.session) {
        showLogin();
        return;
      }

      showDashboard();
      await loadStats();
    } catch {
      showLogin("Unable to restore your session. Please sign in again.");
    }
  }

  initialize();
});
