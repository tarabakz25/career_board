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

async function apiFormData(path, formData) {
	const res = await fetch(path, {
		method: "POST",
		credentials: "same-origin",
		body: formData,
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
	if (state.user.role === "admin") {
		window.location.href = "/career_dashboard";
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
		document.getElementById("submitBtn").disabled = true;
		return;
	}

	// Update back link
	document.getElementById("backLink").href = `/apply?id=${id}`;
	document.getElementById("cancelBtn").href = `/apply?id=${id}`;

	try {
		const job = await api(`/api/jobs/${id}`);
		state.job = job;
		renderJobInfo();
		checkExistingApplication();
	} catch (e) {
		document.getElementById("jobTitle").textContent = e.message;
		document.getElementById("submitBtn").disabled = true;
	}
}

function renderJobInfo() {
	const job = state.job;
	if (!job) return;

	document.getElementById("jobTitle").textContent = job.title;
	document.getElementById("jobCompany").textContent = job.company;
	document.getElementById("jobLocation").textContent =
		job.location || "勤務地未定";
	document.getElementById("jobSalary").textContent = formatSalary(
		job.salaryMin,
		job.salaryMax,
	);
	document.getElementById("jobDeadline").textContent = job.deadline
		? `締切: ${formatDate(job.deadline)}`
		: "締切未設定";
}

function checkExistingApplication() {
	if (!state.user || !state.job) return;

	const msgEl = document.getElementById("formMessage");
	const submitBtn = document.getElementById("submitBtn");

	if (state.user.appliedJobId && state.user.appliedJobId !== state.job.id) {
		msgEl.textContent =
			"他の求人に応募中です。マイページから取り消してから応募してください。";
		msgEl.className = "text-sm font-bold text-cat-peach";
		submitBtn.disabled = true;
		submitBtn.className =
			"flex-1 bg-cat-surface2 text-cat-overlay0 font-bold py-3 rounded-lg cursor-not-allowed";
	} else if (state.user.appliedJobId === state.job.id) {
		msgEl.textContent = "この求人には既に応募済みです。";
		msgEl.className = "text-sm font-bold text-cat-green";
		submitBtn.disabled = true;
		submitBtn.textContent = "応募済み";
		submitBtn.className =
			"flex-1 bg-cat-green/20 text-cat-green font-bold py-3 rounded-lg cursor-not-allowed";
	}
}

async function handleSubmit(e) {
	e.preventDefault();

	const fullName = document.getElementById("fullName").value;
	const phone = document.getElementById("phone").value;
	const coverLetter = document.getElementById("coverLetter").value;
	const resumeFile = document.getElementById("resumeFile").files[0];
	const msgEl = document.getElementById("formMessage");
	const submitBtn = document.getElementById("submitBtn");

	msgEl.textContent = "";
	msgEl.className = "text-sm font-bold";
	submitBtn.disabled = true;
	submitBtn.textContent = "送信中...";

	try {
		// FormDataを使用してファイルと他のデータを送信
		const formData = new FormData();
		formData.append("fullName", fullName);
		formData.append("phone", phone);
		formData.append("coverLetter", coverLetter);
		if (resumeFile) {
			formData.append("resume", resumeFile);
		}

		await apiFormData(`/api/jobs/${state.job.id}/apply`, formData);

		msgEl.textContent = "応募が完了しました！マイページにリダイレクトします...";
		msgEl.className = "text-sm font-bold text-cat-green";
		submitBtn.textContent = "応募完了";
		submitBtn.className =
			"flex-1 bg-cat-green text-cat-base font-bold py-3 rounded-lg";

		setTimeout(() => {
			window.location.href = "/mypage";
		}, 2000);
	} catch (err) {
		msgEl.textContent = err.message;
		msgEl.className = "text-sm font-bold text-cat-red";
		submitBtn.disabled = false;
		submitBtn.textContent = "応募する";
		submitBtn.className =
			"flex-1 bg-cat-blue text-cat-base font-bold py-3 rounded-lg hover:bg-cat-blue/90 transition-colors shadow-lg shadow-cat-blue/20";
	}
}

// ファイル選択ボタンのイベントリスナー
document.getElementById("resumeFileBtn").addEventListener("click", () => {
	document.getElementById("resumeFile").click();
});

document.getElementById("resumeFile").addEventListener("change", (e) => {
	const file = e.target.files[0];
	const fileNameEl = document.getElementById("resumeFileName");

	if (file) {
		// ファイルサイズチェック（10MB）
		if (file.size > 10 * 1024 * 1024) {
			fileNameEl.textContent = "ファイルサイズが大きすぎます（最大10MB）";
			fileNameEl.className = "text-sm text-cat-red";
			e.target.value = "";
			return;
		}

		// ファイルタイプチェック
		const allowedTypes = [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		];
		if (!allowedTypes.includes(file.type)) {
			fileNameEl.textContent = "PDF または Word 形式のファイルを選択してください";
			fileNameEl.className = "text-sm text-cat-red";
			e.target.value = "";
			return;
		}

		fileNameEl.textContent = `選択済み: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
		fileNameEl.className = "text-sm text-cat-green";
	} else {
		fileNameEl.textContent = "ファイルを選択（PDF、Word形式、最大10MB）";
		fileNameEl.className = "text-sm text-cat-subtext1";
	}
});

document.getElementById("applyForm").addEventListener("submit", handleSubmit);

document.getElementById("logoutBtn").addEventListener("click", async () => {
	await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
	window.location.href = "/login";
});

(async function init() {
	await initSession();
	await loadJob();
})();
