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
	msg.className = "min-h-[20px] mb-4 text-sm font-bold";
	if (!state.user || !state.job) return;

	if (state.user.role === "admin") {
		msg.textContent = "管理者アカウントでは応募できません";
		msg.className = "min-h-[20px] mb-4 text-sm font-bold text-cat-peach";
		return;
	}

	const applyBtn = document.createElement("button");
	applyBtn.className =
		"w-full bg-cat-blue text-cat-base font-bold py-3 rounded-lg hover:bg-cat-blue/90 transition-colors shadow-lg shadow-cat-blue/20";
	applyBtn.textContent = "この求人に応募";
	applyBtn.addEventListener("click", () => {
		window.location.href = `/apply_form?id=${state.job.id}`;
	});

	const cancelBtn = document.createElement("button");
	cancelBtn.textContent = "応募を取り消す";
	cancelBtn.className =
		"w-full bg-cat-surface1 text-cat-text font-bold py-3 rounded-lg hover:bg-cat-surface2 transition-colors";
	cancelBtn.addEventListener("click", handleCancel);

	if (state.user.appliedJobId && state.user.appliedJobId !== state.job.id) {
		applyBtn.disabled = true;
		applyBtn.className =
			"w-full bg-cat-surface2 text-cat-overlay0 font-bold py-3 rounded-lg cursor-not-allowed";
		msg.textContent =
			"他の求人に応募中です。マイページから取り消してください。";
		msg.className = "min-h-[20px] mb-4 text-sm font-bold text-cat-peach";
	}

	if (state.user.appliedJobId === state.job.id) {
		applyBtn.textContent = "応募済み";
		applyBtn.disabled = true;
		applyBtn.className =
			"w-full bg-cat-green/20 text-cat-green font-bold py-3 rounded-lg cursor-not-allowed";
		msg.textContent = "この求人に応募済みです";
		msg.className = "min-h-[20px] mb-4 text-sm font-bold text-cat-green";
	}

	container.appendChild(applyBtn);
	if (state.user.appliedJobId === state.job.id) {
		container.appendChild(cancelBtn);
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
		document.getElementById("applyMessage").className =
			"min-h-[20px] mb-4 text-sm font-bold text-cat-blue";
		renderApplyActions();
	} catch (e) {
		document.getElementById("applyMessage").textContent = e.message;
		document.getElementById("applyMessage").className =
			"min-h-[20px] mb-4 text-sm font-bold text-cat-red";
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
