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

function formatSalary(min, max) {
	if (!min && !max) return "給与非公開";
	const f = (n) => Number(n).toLocaleString("ja-JP");
	if (min && max) return `¥${f(min)} - ¥${f(max)}`;
	if (min) return `¥${f(min)} 以上`;
	return `~ ¥${f(max)}`;
}

function formatDate(d) {
	if (!d) return "-";
	return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
		new Date(d),
	);
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

async function loadJob() {
	const params = new URLSearchParams(location.search);
	const id = params.get("id");
	if (!id) {
		document.getElementById("jobTitle").textContent =
			"求人IDが指定されていません";
		return;
	}
	try {
		const job = await api(`/api/jobs/${id}`);
		state.job = job;
		renderJob();
	} catch (e) {
		document.getElementById("jobTitle").textContent = e.message;
	}
}

function renderJob() {
	const job = state.job;
	if (!job) return;
	document.getElementById("jobTitle").textContent = job.title;
	document.getElementById("jobMeta").textContent =
		`${job.company} ｜ ${job.location || "勤務地未定"} ｜ ${formatSalary(job.salaryMin, job.salaryMax)} ｜ 締切 ${formatDate(job.deadline)}`;
	document.getElementById("jobDescription").textContent =
		job.description || "詳細が未登録です";
	renderApplyActions();
}

function renderApplyActions() {
	const container = document.getElementById("applyActions");
	const msg = document.getElementById("applyMessage");
	container.innerHTML = "";
	msg.textContent = "";
	if (!state.user || !state.job) return;

	if (state.user.role === "admin") {
		msg.textContent = "管理者アカウントでは応募できません";
		return;
	}

	const applyBtn = document.createElement("button");
	applyBtn.textContent = "この求人に応募";
	applyBtn.addEventListener("click", handleApply);

	const cancelBtn = document.createElement("button");
	cancelBtn.textContent = "応募を取り消す";
	cancelBtn.classList.add("ghost");
	cancelBtn.addEventListener("click", handleCancel);

	if (state.user.appliedJobId && state.user.appliedJobId !== state.job.id) {
		applyBtn.disabled = true;
		msg.textContent =
			"他の求人に応募中です。マイページから取り消してください。";
	}

	if (state.user.appliedJobId === state.job.id) {
		applyBtn.textContent = "応募済み";
	}

	container.appendChild(applyBtn);
	container.appendChild(cancelBtn);
}

async function handleApply() {
	try {
		await api(`/api/jobs/${state.job.id}/apply`, {
			method: "POST",
			body: JSON.stringify({}),
		});
		state.user.appliedJobId = state.job.id;
		document.getElementById("applyMessage").textContent = "応募しました";
		renderApplyActions();
	} catch (e) {
		document.getElementById("applyMessage").textContent = e.message;
	}
}

async function handleCancel() {
	try {
		await api(`/api/jobs/${state.job.id}/cancel`, {
			method: "POST",
			body: JSON.stringify({}),
		});
		state.user.appliedJobId = null;
		document.getElementById("applyMessage").textContent =
			"応募を取り消しました";
		renderApplyActions();
	} catch (e) {
		document.getElementById("applyMessage").textContent = e.message;
	}
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
	await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
	window.location.href = "/login";
});

(async function init() {
	await initSession();
	await loadJob();
})();
