const state = {
	user: null,
	job: null,
};

async function api(path, options = {}) {
	const res = await fetch(path, {
		headers: { "Content-Type": "application/json" },
		credentials: "same-origin",
		...options,
	});
	if (!res.ok) {
		const msg = await res.json().catch(() => ({}));
		throw new Error(msg.message || res.statusText);
	}
	return res.json();
}

async function initSession() {
	const data = await api("/api/auth/me");
	state.user = data.user;
	if (!state.user) {
		window.location.href = "/login";
		return;
	}
	document.getElementById("userEmail").textContent = state.user.email;
}

async function loadApplication() {
	const statusEl = document.getElementById("accountStatus");
	const jobEl = document.getElementById("accountJob");
	try {
		const data = await api("/api/jobs/me/application");
		state.job = data.job;
		if (!state.job) {
			statusEl.textContent = "現在応募中の求人はありません";
			jobEl.textContent = "";
			document.getElementById("cancelBtn").disabled = true;
			return;
		}
		statusEl.textContent = "応募中の求人";
		jobEl.innerHTML = `${state.job.title}<br>${state.job.company}<br>${state.job.location || "勤務地未定"}`;
		document.getElementById("cancelBtn").disabled = false;
	} catch (e) {
		statusEl.textContent = e.message;
	}
}

document.getElementById("cancelBtn").addEventListener("click", async () => {
	if (!state.job) return;
	if (!confirm("応募を取り消しますか？")) return;
	try {
		await api(`/api/jobs/${state.job.id}/cancel`, {
			method: "POST",
			body: JSON.stringify({}),
		});
		state.job = null;
		await loadApplication();
	} catch (e) {
		alert(e.message);
	}
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
	await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
	window.location.href = "/login";
});

(async function init() {
	await initSession();
	await loadApplication();
})();
