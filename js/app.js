// Mengambil koneksi Firebase yang sudah disiapkan.
import { db, auth } from "./firebase.js";

// Mengambil fungsi untuk mengelola data Firestore.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// Mengambil fungsi untuk mengelola login pengguna.
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
// mengimpor koneksi Firebase dan fungsi-fungsi yang dibutuhkan. 
// Fungsi tersebut digunakan untuk menangani login dan mengelola data barang pada Cloud Firestore.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

const MAX_PHOTO_DATA_URL_LENGTH = 420 * 1024;

const CATEGORIES = [
  "Elektronik",
  "Perhiasan",
  "Furniture",
  "Peralatan Rumah",
  "Dokumen",
  "Koleksi",
  "Fashion",
  "Lainnya",
];

const ROOM_ICONS = ["⌂", "☾", "♨", "▧", "▤", "⌁", "✿", "♡"];

let currentUser = null; 
let items = [];
let unsubscribeItems = null;
let currentView = "dashboard";
let editingId = null;
let photoDraft = "";
let selectedRoom = "";
let authMode = "login";
let toastCounter = 0;
let itemIdToDelete = null;

const authScreen = $("#auth-screen");
const appShell = $("#app-shell");
const mobileNav = $("#mobile-nav");
const itemModal = $("#item-modal");
const itemForm = $("#item-form");
const detailModal = $("#detail-modal");

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function showToast(message, type = "success") {
  const region = $("#toast-region");
  if (!region) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const dot = document.createElement("span");
  dot.className = "toast-dot";

  const text = document.createElement("span");
  text.textContent = message;

  toast.append(dot, text);

  const id = ++toastCounter;
  toast.dataset.toastId = String(id);

  region.appendChild(toast);

  window.setTimeout(() => toast.remove(), 4300);
}

function setLoading(visible, message = "Menyiapkan ruangmu...") {
  const loadingText = $("#loading-text");
  const loadingOverlay = $("#loading-overlay");

  if (loadingText) loadingText.textContent = message;
  if (loadingOverlay) loadingOverlay.classList.toggle("hidden", !visible);
}

function errorMessage(error, fallback = "Terjadi kendala. Coba lagi ya.") {
  const code = String(error?.code || "");

  const messages = {
    "auth/email-already-in-use":
      "Email ini sudah terdaftar. Coba masuk ke akunmu.",

    "auth/invalid-email": "Format email belum benar.",

    "auth/invalid-credential":
      "Email atau password belum cocok. Jika belum punya akun, pilih Daftar.",

    "auth/invalid-login-credentials":
      "Email atau password belum cocok. Jika belum punya akun, pilih Daftar.",

    "auth/user-not-found": "Akun belum ditemukan. Coba daftar terlebih dahulu.",

    "auth/wrong-password": "Password belum benar. Coba lagi.",

    "auth/weak-password": "Gunakan password minimal 6 karakter.",

    "auth/missing-password": "Password wajib diisi.",

    "auth/operation-not-allowed":
      "Metode login belum aktif. Periksa Authentication → Sign-in method di Firebase Console.",

    "auth/admin-restricted-operation":
      "Operasi ini belum diizinkan. Periksa provider Authentication di Firebase Console.",

    "auth/unauthorized-domain":
      "Domain aplikasi belum diizinkan. Periksa Authentication → Settings → Authorized domains di Firebase Console.",

    "auth/app-not-authorized":
      "Aplikasi atau domain belum diizinkan untuk proyek Firebase ini. Periksa konfigurasi proyek.",

    "auth/invalid-api-key":
      "API key Firebase tidak valid. Periksa konfigurasi firebase.js.",

    "auth/configuration-not-found":
      "Firebase Authentication belum siap dikonfigurasi. Periksa Authentication di Firebase Console.",

    "auth/auth-domain-config-required":
      "authDomain belum dikonfigurasi. Periksa firebase.js.",

    "auth/network-request-failed":
      "Koneksi internet bermasalah atau permintaan Firebase terblokir.",

    "auth/too-many-requests":
      "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",

    "auth/web-storage-unsupported":
      "Browser tidak mendukung penyimpanan sesi. Coba browser lain atau gunakan Live Server.",

    "permission-denied":
      "Akses Firestore ditolak. Periksa Firestore Security Rules.",

    unavailable: "Firebase sementara tidak dapat dijangkau. Periksa internet.",

    "resource-exhausted":
      "Kuota Firebase mungkin sudah tercapai. Periksa penggunaan di Firebase Console.",

    "failed-precondition":
      "Database belum siap atau ada prasyarat yang belum terpenuhi.",

    "invalid-argument":
      "Data yang dikirim tidak valid. Periksa isian formulir.",
  };

  if (messages[code]) return messages[code];

  return code ? `${fallback} (Kode: ${code})` : fallback;
}

function formatRupiah(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) return "Tanggal tidak dicatat";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Tanggal tidak valid";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dateIsWithinNextDays(value, days = 30) {
  if (!value) return false;

  const target = new Date(`${value}T00:00:00`);

  if (Number.isNaN(target.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latest = new Date(today);
  latest.setDate(latest.getDate() + days);

  return target >= today && target <= latest;
}

function sortByNewest(list) {
  return [...list].sort(
    (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
  );
}

function safeImageSource(photo) {
  return typeof photo === "string" && photo.startsWith("data:image/")
    ? photo
    : "";
}

function showAuthScreen() {
  authScreen?.classList.remove("hidden");
  appShell?.classList.add("hidden");
  mobileNav?.classList.add("hidden");
}

function showAppScreen() {
  authScreen?.classList.add("hidden");
  appShell?.classList.remove("hidden");
  mobileNav?.classList.remove("hidden");
}

function updateAccountUI() {
  if (!currentUser) return;

  const isGuest = currentUser.isAnonymous;
  const email = currentUser.email || "Teman Tamu";

  const name = isGuest ? "Teman Tamu" : email.split("@")[0] || "Teman";

  $("#account-name").textContent = name;

  $("#account-type").textContent = isGuest
    ? "Mode tamu · perangkat ini"
    : "Akun terdaftar";

  $("#account-avatar").textContent = isGuest
    ? "♡"
    : name.slice(0, 1).toUpperCase();

  $("#welcome-name").textContent = name;
}

function showAuthForm(show) {
  $("#auth-form").classList.toggle("hidden", !show);
  $("#auth-actions").classList.toggle("hidden", show);

  $("#auth-error").textContent = "";

  if (show) {
    updateAuthModeUI();

    window.setTimeout(() => {
      $("#auth-email").focus();
    }, 50);
  }
}

function ensureConfirmPasswordField() {
  let group = $("#auth-confirm-group");

  if (group) return group;

  const passwordInput = $("#auth-password");

  if (!passwordInput) return null;

  group = document.createElement("div");
  group.id = "auth-confirm-group";
  group.className = "hidden";
  group.style.display = "grid";
  group.style.gap = "9px";

  const label = document.createElement("label");
  label.htmlFor = "auth-confirm-password";
  label.textContent = "Konfirmasi password";

  const input = document.createElement("input");
  input.id = "auth-confirm-password";
  input.name = "confirmPassword";
  input.type = "password";
  input.autocomplete = "new-password";
  input.placeholder = "Ketik ulang password";
  input.minLength = 6;
  input.maxLength = 128;

  group.append(label, input);

  passwordInput.insertAdjacentElement("afterend", group);

  return group;
}

function updateAuthModeUI() {
  const registering = authMode === "register";

  const confirmGroup = ensureConfirmPasswordField();
  const confirmInput = $("#auth-confirm-password");

  $("#auth-title").textContent = registering
    ? "Buat ruang milikmu"
    : "Selamat datang kembali!";

  $("#auth-description").textContent = registering
    ? "Daftar untuk menjaga inventarismu tetap tersimpan dan mudah diakses."
    : "Masuk untuk membuka kembali koleksi barang berhargamu.";

  $("#auth-submit").textContent = registering ? "Buat akun" : "Masuk ke akun";

  $("#auth-mode-toggle").textContent = registering
    ? "Sudah punya akun? Masuk"
    : "Belum punya akun? Daftar";

  $("#auth-password").autocomplete = registering
    ? "new-password"
    : "current-password";

  if (confirmGroup) {
    confirmGroup.classList.toggle("hidden", !registering);
  }

  if (confirmInput) {
    confirmInput.required = registering;

    if (!registering) {
      confirmInput.value = "";
    }
  }
}

function setupPasswordToggle(input) {
  if (!input || input.dataset.passwordToggleReady === "true") {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "password-input-wrap";

  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "password-toggle";
  toggle.setAttribute("aria-label", "Tampilkan password");
  toggle.setAttribute("aria-pressed", "false");

  const eyeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;

  const eyeOffIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M3 3l18 18"></path>
    </svg>
  `;

  toggle.innerHTML = eyeIcon;
  wrapper.appendChild(toggle);

  input.dataset.passwordToggleReady = "true";
  input.classList.add("password-field");

  toggle.addEventListener("click", () => {
    const showPassword = input.type === "password";

    input.type = showPassword ? "text" : "password";

    toggle.setAttribute(
      "aria-label",
      showPassword ? "Sembunyikan password" : "Tampilkan password",
    );

    toggle.setAttribute("aria-pressed", String(showPassword));
    toggle.innerHTML = showPassword ? eyeOffIcon : eyeIcon;
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;

  const confirmInput = $("#auth-confirm-password");

  const confirmPassword = confirmInput ? confirmInput.value : password;

  const errorElement = $("#auth-error");

  errorElement.textContent = "";

  const registering = authMode === "register";

  if (!email || !password) {
    errorElement.textContent = "Email dan password wajib diisi.";
    return;
  }

  if (registering && password.length < 6) {
    errorElement.textContent = "Password harus memiliki minimal 6 karakter.";
    return;
  }

  if (registering && password !== confirmPassword) {
    errorElement.textContent =
      "Konfirmasi password belum sama. Periksa kembali kedua kolom password.";

    confirmInput?.focus();
    return;
  }

  const submitButton = $("#auth-submit");

  submitButton.disabled = true;

  submitButton.textContent = registering
    ? "Membuat akun..."
    : "Memeriksa akun...";

  setLoading(
    true,
    registering ? "Membuat ruang pribadimu..." : "Membuka ruang pribadimu...",
  );

  try {
    if (registering) {
      // Membuat akun baru menggunakan email dan password.
      await createUserWithEmailAndPassword(auth, email, password);

      showToast("Akun berhasil dibuat. Selamat datang!", "success");
    } else {
      await signInWithEmailAndPassword(auth, email, password);

      showToast("Berhasil masuk. Selamat datang kembali!", "success");
    }
  } catch (error) {
    console.error(
      "[Firebase Authentication]",
      error?.code || "tanpa-kode",
      error?.message || error,
    );

    errorElement.textContent = errorMessage(
      error,
      "Akun belum dapat dibuka. Periksa data lalu coba lagi.",
    );
  } finally {
    submitButton.disabled = false;

    updateAuthModeUI();

    setLoading(false);
  }
}

async function signInGuest() {
  $("#auth-error").textContent = "";

  setLoading(true, "Menyiapkan ruang tamu...");

  try {
    await signInAnonymously(auth);

    showToast("Mode tamu siap. Barangmu mulai tertata!", "success");
  } catch (error) {
    console.error(
      "[Firebase Anonymous Authentication]",
      error?.code || "tanpa-kode",
      error?.message || error,
    );

    $("#auth-error").textContent = errorMessage(
      error,
      "Mode tamu belum bisa dimulai. Periksa konfigurasi Authentication di Firebase Console.",
    );
  } finally {
    setLoading(false);
  }
}

function signOutUser() {
  if (!currentUser) return;

  const modal = $("#logout-modal");
  const card = modal?.querySelector(".logout-card");
  const title = $("#logout-title");
  const message = $("#logout-message");

  if (!modal || !card || !title || !message) {
    console.error("Elemen modal logout tidak ditemukan di index.html.");
    return;
  }

  if (currentUser.isAnonymous) {
    title.textContent = "Keluar dari mode tamu?";

    message.textContent =
      "Identitas tamu dan akses ke koleksinya mungkin " +
      "tidak bisa dipulihkan setelah keluar. Gunakan akun " +
      "email agar barangmu dapat diakses kembali.";

    card.classList.add("is-guest");
  } else {
    title.textContent = "Yakin ingin keluar?";

    message.textContent =
      "Kamu bisa masuk kembali kapan saja untuk melihat " +
      "koleksi barang kesayanganmu.";

    card.classList.remove("is-guest");
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  $("#logout-cancel").focus();
}

function closeLogoutModal() {
  const modal = $("#logout-modal");

  if (!modal) return;

  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

async function confirmSignOut() {
  if (!currentUser) return;

  closeLogoutModal();

  try {
    if (unsubscribeItems) {
      unsubscribeItems();
    }

    unsubscribeItems = null;

    await signOut(auth);

    showToast("Kamu sudah keluar.", "success");
  } catch (error) {
    console.error("[Firebase Sign Out]", error);

    showToast(errorMessage(error, "Belum bisa keluar. Coba lagi."), "error");
  }
}

function userItemsCollection() {
  // currentUser menyimpan informasi pengguna yang sedang login.
  if (!currentUser) {
    throw new Error("Pengguna belum masuk.");
  }

  // currentUser.uid merupakan identitas unik pengguna
  // Dengan struktur ini, inventaris setiap pengguna berada pada jalurnya sendiri
  return collection(db, "users", currentUser.uid, "items");
}

function listenToUserItems() {
  if (!currentUser) return;

  if (unsubscribeItems) {
    unsubscribeItems();
  }

  setLoading(true, "Merapikan koleksi barangmu...");

  unsubscribeItems = onSnapshot(
    userItemsCollection(),
    (snapshot) => {
      items = snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      }));

      items = items.map((item) => ({
        ...item,

        name: typeof item.name === "string" ? item.name : "Barang tanpa nama",

        serial: typeof item.serial === "string" ? item.serial : "",

        room:
          typeof item.room === "string" && item.room.trim()
            ? item.room.trim()
            : "Lainnya",

        category: typeof item.category === "string" ? item.category : "Lainnya",

        condition: typeof item.condition === "string" ? item.condition : "Baik",

        price: Number(item.price || 0),

        photo: safeImageSource(item.photo),
      }));

      updateAccountUI();
      renderAll();

      setLoading(false);
    },
    (error) => {
      console.error(
        "[Cloud Firestore snapshot]",
        error?.code || "tanpa-kode",
        error?.message || error,
      );

      setLoading(false);

      showToast(
        errorMessage(
          error,
          "Tidak dapat memuat inventaris. Periksa koneksi dan Firestore Rules.",
        ),
        "error",
      );
    },
  );
}

function renderAll() {
  renderStats();
  updateFilterOptions();
  renderDashboard();
  renderInventory();
  renderRooms();

  $("#nav-item-count").textContent = String(items.length);

  $("#footer-year").textContent = String(new Date().getFullYear());
}

function renderStats() {
  const roomNames = new Set(items.map((item) => item.room || "Lainnya"));

  const totalValue = items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.price) || 0),
    0,
  );

  const upcomingWarranties = items.filter((item) =>
    dateIsWithinNextDays(item.warrantyDate, 30),
  ).length;

  $("#stat-items").textContent = String(items.length);
  $("#stat-rooms").textContent = String(roomNames.size);
  let displayTotalValue = formatRupiah(totalValue);

  if (window.matchMedia("(max-width: 650px)").matches) {
    if (totalValue >= 1_000_000_000) {
      displayTotalValue = `Rp ${(totalValue / 1_000_000_000).toLocaleString(
        "id-ID",
        {
          maximumFractionDigits: 2,
        },
      )} M`;
    } else if (totalValue >= 1_000_000) {
      displayTotalValue = `Rp ${(totalValue / 1_000_000).toLocaleString(
        "id-ID",
        {
          maximumFractionDigits: 1,
        },
      )} jt`;
    } else if (totalValue >= 1_000) {
      displayTotalValue = `Rp ${(totalValue / 1_000).toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      })} rb`;
    }
  }

  $("#stat-value").textContent = displayTotalValue;
  $("#stat-warranty").textContent = String(upcomingWarranties);
}

function conditionClass(condition) {
  if (condition === "Perlu Perbaikan") return "repair";
  if (condition === "Rusak") return "broken";

  return "";
}

function itemCard(item) {
  const image = safeImageSource(item.photo);

  const serial = item.serial ? escapeHtml(item.serial) : "Tidak ada nomor seri";

  const room = escapeHtml(item.room || "Lainnya");
  const category = escapeHtml(item.category || "Lainnya");
  const condition = escapeHtml(item.condition || "Baik");

  const dateText = item.purchaseDate
    ? `Dibeli ${escapeHtml(formatDate(item.purchaseDate))}`
    : "Tanggal pembelian belum dicatat";

  const photoMarkup = image
    ? `<img src="${escapeHtml(image)}" alt="Foto ${escapeHtml(item.name)}" loading="lazy" />`
    : `<div class="photo-placeholder"><span class="photo-heart">♡</span><small>NO PHOTO YET</small></div>`;

  return `
    <article class="item-card" data-action="view-item" data-id="${escapeHtml(item.id)}">
      <div class="item-photo">
        ${photoMarkup}
        <span class="item-badge">${category}</span>
        <span class="item-condition ${conditionClass(item.condition)}">${condition}</span>
      </div>

      <div class="item-body">
        <div class="item-title-line">
          <h3 class="item-title">${escapeHtml(item.name)}</h3>

          <div class="item-menu">
            <button
              class="mini-icon-button"
              data-action="edit-item"
              data-id="${escapeHtml(item.id)}"
              type="button"
              aria-label="Edit ${escapeHtml(item.name)}"
              title="Edit"
            >✎</button>

            <button
              class="mini-icon-button"
              data-action="delete-item"
              data-id="${escapeHtml(item.id)}"
              type="button"
              aria-label="Hapus ${escapeHtml(item.name)}"
              title="Hapus"
            >×</button>
          </div>
        </div>

        <p class="item-meta">
          ${escapeHtml(item.brand || "Merek tidak dicatat")} · ${room}
        </p>

        <div class="item-serial">
          <span>SN</span>
          <span title="${serial}">${serial}</span>
        </div>

        <div class="item-footer">
          <span class="item-price">${formatRupiah(item.price)}</span>
          <span class="item-date">${dateText}</span>
        </div>
      </div>
    </article>
  `;
}

function openItemDetails(item) {
  if (!item || !detailModal) return;

  const photo = safeImageSource(item.photo);

  $("#detail-title").textContent = item.name || "Detail barang";

  const photoHtml = photo
    ? `<div class="detail-photo-wrap">
         <img
           src="${escapeHtml(photo)}"
           alt="Foto ${escapeHtml(item.name)}"
         />
       </div>`
    : `<div class="detail-photo-placeholder">
         ♡
         <span>Foto tidak tersedia</span>
       </div>`;

  const fields = [
    ["Nomor seri", item.serial || "Tidak memiliki nomor seri"],
    ["Merek", item.brand || "Tidak dicatat"],
    ["Kategori", item.category || "Lainnya"],
    ["Ruangan", item.room || "Lainnya"],
    ["Harga beli", formatRupiah(item.price)],
    [
      "Tanggal pembelian",
      item.purchaseDate ? formatDate(item.purchaseDate) : "Tidak dicatat",
    ],
    [
      "Garansi berakhir",
      item.warrantyDate ? formatDate(item.warrantyDate) : "Tidak dicatat",
    ],
    ["Kondisi", item.condition || "Baik"],
    ["Catatan", item.notes || "Tidak ada catatan"],
  ];

  $("#detail-content").innerHTML = `
  <div class="detail-content-layout">
    <div class="detail-photo-column">
      ${photoHtml}
    </div>

    <div class="detail-info-column">
      <div class="detail-fields">
        ${fields
          .map(
            ([label, value]) => `
          <div class="detail-field ${
            label === "Catatan" ? "detail-field-wide" : ""
          }">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  </div>
`;

  const detailCard = detailModal.querySelector(".detail-modal-card");
  const detailContent = $("#detail-content");

  if (detailCard) detailCard.scrollTop = 0;
  if (detailContent) detailContent.scrollTop = 0;

  detailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeItemDetails() {
  detailModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function renderDashboard() {
  const latest = sortByNewest(items).slice(0, 4);

  $("#recent-items").innerHTML = latest.map(itemCard).join("");

  $("#dashboard-empty").classList.toggle("hidden", items.length !== 0);

  $("#recent-items").classList.toggle("hidden", items.length === 0);
}

function currentSearchTerm() {
  return ($("#inventory-search").value || $("#global-search").value || "")
    .trim()
    .toLocaleLowerCase("id-ID");
}

function getFilteredItems() {
  const query = currentSearchTerm();

  const room = $("#filter-room").value;
  const category = $("#filter-category").value;
  const condition = $("#filter-condition").value;

  let result = items.filter((item) => {
    const searchable = [
      item.name,
      item.serial,
      item.brand,
      item.room,
      item.category,
      item.notes,
    ]
      .join(" ")
      .toLocaleLowerCase("id-ID");
      // join(" ") menggabungkan beberapa informasi barang menjadi satu teks
      // toLocaleLowerCase("id-ID") mengubah teks menjadi huruf kecil untuk membantu pencarian 
      // yang tidak bergantung pada huruf besar atau kecil

    return (
      (!query || searchable.includes(query)) &&
      (!room || item.room === room) &&
      (!category || item.category === category) &&
      (!condition || item.condition === condition)
    );
  });

  const sort = $("#sort-by").value;

  if (sort === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name, "id"));
  } else if (sort === "price-high") {
    result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (sort === "price-low") {
    result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else {
    result = sortByNewest(result);
  }

  return result;
}

function setOptionsKeepingValue(select, values, firstLabel) {
  const previous = select.value;

  select.innerHTML =
    `<option value="">${escapeHtml(firstLabel)}</option>` +
    values
      .map(
        (value) =>
          `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`,
      )
      .join("");

  if (values.includes(previous)) {
    select.value = previous;
  }
}

function updateFilterOptions() {
  const rooms = [
    ...new Set(items.map((item) => item.room).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "id"));

  const categories = [
    ...new Set([
      ...CATEGORIES,
      ...items.map((item) => item.category).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b, "id"));

  setOptionsKeepingValue($("#filter-room"), rooms, "Semua ruangan");

  setOptionsKeepingValue($("#filter-category"), categories, "Semua kategori");
}

function renderInventory() {
  const filtered = getFilteredItems();

  $("#inventory-items").innerHTML = filtered.map(itemCard).join("");

  $("#results-count").textContent =
    `${filtered.length} dari ${items.length} barang`;

  $("#inventory-empty").classList.toggle("hidden", filtered.length !== 0);

  if (filtered.length === 0) {
    const hasFilter = Boolean(
      currentSearchTerm() ||
      $("#filter-room").value ||
      $("#filter-category").value ||
      $("#filter-condition").value,
    );

    $("#inventory-empty h3").textContent = hasFilter
      ? "Barang tidak ditemukan"
      : "Belum ada barang di sini";

    $("#inventory-empty p").textContent = hasFilter
      ? "Coba ubah kata kunci atau reset filter."
      : "Tambahkan barang pertamamu untuk memulai katalog.";
  }
}

function roomEmoji(room) {
  const name = room.toLocaleLowerCase("id-ID");

  if (name.includes("tamu") || name.includes("keluarga")) return "⌂";
  if (name.includes("tidur") || name.includes("bedroom")) return "☾";
  if (name.includes("dapur") || name.includes("makan")) return "♨";
  if (name.includes("kerja") || name.includes("belajar")) return "▧";
  if (name.includes("gudang") || name.includes("penyimpanan")) return "▤";
  if (name.includes("garasi")) return "⌁";

  return ROOM_ICONS[
    Math.abs([...name].reduce((total, char) => total + char.charCodeAt(0), 0)) %
      ROOM_ICONS.length
  ];
}

function renderRooms() {
  const roomMap = new Map();

  items.forEach((item) => {
    const room = item.room || "Lainnya";

    if (!roomMap.has(room)) {
      roomMap.set(room, []);
    }

    roomMap.get(room).push(item);
  });

  const rooms = [...roomMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "id"),
  );

  const palette = [
    "room-pink",
    "room-lilac",
    "room-peach",
    "room-green",
    "room-blue",
    "room-yellow",
  ];

  $("#room-grid").innerHTML = rooms
    .map(([room, roomItems], index) => {
      const total = roomItems.reduce(
        (sum, item) => sum + Number(item.price || 0),
        0,
      );

      return `
        <article
          class="room-card"
          role="button"
          tabindex="0"
          data-action="open-room"
          data-room="${escapeHtml(room)}"
          aria-label="Lihat barang di ${escapeHtml(room)}"
        >
          <div class="room-cover ${palette[index % palette.length]}">
            <span>${roomEmoji(room)}</span>
          </div>

          <div class="room-card-body">
            <h3>${escapeHtml(room)}</h3>

            <div class="room-card-bottom">
              <span>${roomItems.length} barang</span>
              <strong>${formatRupiah(total)}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  $("#rooms-empty").classList.toggle("hidden", rooms.length > 0);

  renderRoomDetail();
}

function renderRoomDetail() {
  const detail = $("#room-detail");

  if (!selectedRoom) {
    detail.classList.add("hidden");
    return;
  }

  const roomItems = sortByNewest(
    items.filter((item) => item.room === selectedRoom),
  );

  $("#room-detail-title").textContent = selectedRoom;

  $("#room-detail-items").innerHTML = roomItems.map(itemCard).join("");

  detail.classList.remove("hidden");
}

function setView(view) {
  if (!["dashboard", "inventory", "rooms"].includes(view)) {
    return;
  }

  currentView = view;

  $$(".content-view").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `view-${view}`);
  });

  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  if (view === "inventory") renderInventory();
  if (view === "rooms") renderRooms();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function setPhotoPreview(dataUrl) {
  const preview = $("#photo-preview");
  const image = safeImageSource(dataUrl);

  if (image) {
    preview.innerHTML = `<img src="${escapeHtml(image)}" alt="Pratinjau foto barang" />`;

    $("#remove-photo-button")?.classList.remove("hidden");
  } else {
    preview.innerHTML = "<span>♡</span><small>Foto barang</small>";

    $("#remove-photo-button")?.classList.add("hidden");
  }
}

function openItemModal(item = null) {
  editingId = item?.id || null;
  photoDraft = item?.photo || "";

  itemForm.reset();

  $("#item-form-error").textContent = "";

  $("#modal-title").innerHTML = editingId
    ? "Edit detail barang <span>♡</span>"
    : "Tambah barang baru <span>♡</span>";

  $("#save-item-button").innerHTML = editingId
    ? "Simpan perubahan <span>♡</span>"
    : "Simpan barang <span>♡</span>";

  if (item) {
    itemForm.elements.name.value = item.name || "";
    itemForm.elements.serial.value = item.serial || "";
    itemForm.elements.brand.value = item.brand || "";
    itemForm.elements.category.value = item.category || "";
    itemForm.elements.room.value = item.room || "";

    itemForm.elements.price.value = Number(item.price || 0) || "";

    itemForm.elements.purchaseDate.value = item.purchaseDate || "";

    itemForm.elements.warrantyDate.value = item.warrantyDate || "";

    itemForm.elements.condition.value = item.condition || "Baik";

    itemForm.elements.notes.value = item.notes || "";
  } else {
    itemForm.elements.condition.value = "Baik";
  }

  setPhotoPreview(photoDraft);

  itemModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  window.setTimeout(() => {
    $("#item-name").focus();
  }, 80);
}

function closeItemModal() {
  itemModal.classList.add("hidden");

  document.body.style.overflow = "";

  editingId = null;
  photoDraft = "";

  itemForm.reset();
}

function validateItemForm(payload) {
  if (!payload.name) {
    return "Nama barang wajib diisi.";
  }

  if (!payload.category) {
    return "Pilih kategori barang terlebih dahulu.";
  }

  if (!payload.room) {
    return "Ruangan wajib diisi.";
  }

  if (!payload.photo || !payload.photo.startsWith("data:image/")) {
    return "Foto barang wajib ditambahkan sebelum menyimpan.";
  }

  if (payload.price < 0 || !Number.isFinite(payload.price)) {
    return "Harga barang harus berupa angka nol atau lebih.";
  }

  if (
    payload.purchaseDate &&
    payload.warrantyDate &&
    payload.warrantyDate < payload.purchaseDate
  ) {
    return "Tanggal berakhirnya garansi tidak boleh lebih awal dari tanggal pembelian.";
  }

  if (payload.serial) {
    const normalizedSerial = payload.serial.trim().toLocaleLowerCase("id-ID");

    const duplicate = items.find(
      (item) =>
        item.id !== editingId &&
        String(item.serial || "")
          .trim()
          .toLocaleLowerCase("id-ID") === normalizedSerial,
    );

    if (duplicate) {
      return `Nomor seri sudah digunakan oleh barang "${duplicate.name}".`;
    }
  }

  if (photoDraft && photoDraft.length > MAX_PHOTO_DATA_URL_LENGTH) {
    return "Ukuran foto masih terlalu besar. Pilih foto lain atau kompres terlebih dahulu.";
  }

  return "";
}

async function saveItem(event) {
  event.preventDefault();

  if (!currentUser) {
    $("#item-form-error").textContent =
      "Sesi akun tidak ditemukan. Masuk kembali terlebih dahulu.";

    return;
  }

  const existing = editingId
    ? items.find((item) => item.id === editingId)
    : null;

  const priceValue = itemForm.elements.price.value.trim();

  const payload = {
    name: itemForm.elements.name.value.trim(),

    serial: itemForm.elements.serial.value.trim(),

    brand: itemForm.elements.brand.value.trim(),

    category: itemForm.elements.category.value,

    room: itemForm.elements.room.value.trim(),

    price: priceValue === "" ? 0 : Number(priceValue),

    purchaseDate: itemForm.elements.purchaseDate.value || "",

    warrantyDate: itemForm.elements.warrantyDate.value || "",

    condition: itemForm.elements.condition.value || "Baik",

    notes: itemForm.elements.notes.value.trim(),

    photo: photoDraft || "",

    createdAt: existing?.createdAt || Date.now(),

    updatedAt: Date.now(),
  };

  const problem = validateItemForm(payload);

  if (problem) {
    $("#item-form-error").textContent = problem;
    return;
  }

  const saveButton = $("#save-item-button");
  const wasEditing = Boolean(editingId);

  saveButton.disabled = true;
  saveButton.textContent = "Menyimpan...";

  $("#item-form-error").textContent = "";

  try {
    if (editingId) {
      // Barang sudah ada, jadi perbarui datanya (edit)
      await updateDoc(
        doc(db, "users", currentUser.uid, "items", editingId),
        payload,
      );

      showToast("Perubahan barang berhasil disimpan.", "success");
    } else {
      // Barang belum ada, jadi buat dokumen baru (create)
      await addDoc(userItemsCollection(), payload);

      showToast("Barang baru berhasil ditambahkan.", "success");
    }

    closeItemModal();
  } catch (error) {
    console.error(
      "[Simpan Barang]",
      error?.code || "tanpa-kode",
      error?.message || error,
    );

    $("#item-form-error").textContent = errorMessage(
      error,
      "Barang belum tersimpan. Periksa koneksi internet dan Firestore Rules.",
    );
  } finally {
    saveButton.disabled = false;

    $("#save-item-button").innerHTML = wasEditing
      ? "Simpan perubahan <span>♡</span>"
      : "Simpan barang <span>♡</span>";
  }
}

function deleteItem(id) {
  const item = items.find((candidate) => candidate.id === id);

  if (!item || !currentUser) return;

  const modal = $("#delete-modal");
  const message = $("#delete-message");

  if (!modal || !message) {
    console.error("Modal hapus tidak ditemukan di index.html.");
    return;
  }

  itemIdToDelete = id;

  message.textContent =
    `Yakin ingin menghapus "${item.name}" dari inventaris? ` +
    "Tindakan ini tidak bisa dibatalkan.";

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  $("#delete-cancel").focus();
}

function closeDeleteConfirmModal() {
  const modal = $("#delete-modal");

  if (!modal) return;

  modal.classList.add("hidden");
  document.body.style.overflow = "";
  itemIdToDelete = null;
}

async function confirmDeleteItem() {
  const id = itemIdToDelete;

  if (!id || !currentUser) {
    closeDeleteConfirmModal();
    return;
  }

  const button = $("#delete-confirm");

  button.disabled = true;
  button.textContent = "Menghapus...";

  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "items", id));
    // doc() menunjuk dokumen yang akan dihapus, sedangkan deleteDoc() menghapusnya dari Firestore.

    closeDeleteConfirmModal();

    showToast("Barang berhasil dihapus.", "success");
  } catch (error) {
    console.error(
      "[Hapus Barang]",
      error?.code || "tanpa-kode",
      error?.message || error,
    );

    showToast(
      errorMessage(error, "Barang belum bisa dihapus. Coba lagi."),
      "error",
    );
  } finally {
    button.disabled = false;
    button.textContent = "Ya, hapus";
  }
}

function compressImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : "";

    const sourceUrl =
      objectUrl ||
      (String(source).startsWith("data:image/")
        ? String(source)
        : `data:image/jpeg;base64,${source}`);

    image.onload = () => {
      try {
        let maxDimension = 1000;
        let quality = 0.76;
        let result = "";

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const scale = Math.min(
            1,
            maxDimension /
              Math.max(
                image.naturalWidth || image.width,
                image.naturalHeight || image.height,
              ),
          );

          const width = Math.max(
            1,
            Math.round((image.naturalWidth || image.width) * scale),
          );

          const height = Math.max(
            1,
            Math.round((image.naturalHeight || image.height) * scale),
          );

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d", { alpha: false });

          if (!context) {
            throw new Error("Browser tidak mendukung kompresi gambar.");
          }

          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);

          context.drawImage(image, 0, 0, width, height);

          result = canvas.toDataURL("image/jpeg", quality);

          canvas.width = 1;
          canvas.height = 1;

          if (result.length <= MAX_PHOTO_DATA_URL_LENGTH) {
            resolve(result);
            return;
          }

          if (quality > 0.48) {
            quality -= 0.08;
          } else {
            maxDimension = Math.max(420, Math.floor(maxDimension * 0.82));
          }
        }

        if (result.length <= MAX_PHOTO_DATA_URL_LENGTH) {
          resolve(result);
        } else {
          reject(
            new Error(
              "Foto terlalu besar setelah dikompres. Pilih gambar yang lebih kecil.",
            ),
          );
        }
      } catch (error) {
        reject(error);
      } finally {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    };

    image.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      reject(new Error("Gambar tidak dapat dibuka. Pilih file gambar lain."));
    };

    image.src = sourceUrl;
  });
}

async function processPhotoSource(source) {
  setLoading(true, "Mengoptimalkan foto...");

  try {
    // Memperkecil ukuran foto.
    const compressed = await compressImage(source);

    // Menyimpan foto sementara.
    photoDraft = compressed;

    // Menampilkan pratinjau foto.
    setPhotoPreview(compressed);

    const approximateKb = Math.round((compressed.length * 0.75) / 1024);

    showToast(`Foto siap disimpan · sekitar ${approximateKb} KB`, "success");
  } catch (error) {
    console.error("[Kompresi Foto]", error);

    showToast(error.message || "Foto tidak dapat diproses.", "error");
  } finally {
    setLoading(false);
  }
}

function openFilePicker(sourceType = "gallery") {
  const fileInput = $("#photo-input");

  fileInput.value = "";

  if (sourceType === "camera") {
    fileInput.setAttribute("capture", "environment");
  } else {
    fileInput.removeAttribute("capture");
  }

  fileInput.click();
}

function captureOrChoosePhoto(sourceType) {
  const camera = window.Camera || window.CameraPlugin;

  if (
    window.cordova &&
    navigator.camera &&
    camera?.DestinationType &&
    camera?.PictureSourceType
  ) {
    const options = {
      quality: 48,

      destinationType: camera.DestinationType.FILE_URI,

      sourceType:
        sourceType === "camera"
          ? camera.PictureSourceType.CAMERA
          : camera.PictureSourceType.PHOTOLIBRARY,

      encodingType: camera.EncodingType?.JPEG ?? 0,

      mediaType: camera.MediaType?.PICTURE ?? 0,

      correctOrientation: true,

      targetWidth: 1000,

      targetHeight: 1000,

      allowEdit: false,

      saveToPhotoAlbum: false,
    };

    try {
      navigator.camera.getPicture(
        (imageUri) => {
          if (!imageUri) return;

          if (String(imageUri).startsWith("data:image/")) {
            processPhotoSource(imageUri);
            return;
          }

          if (typeof window.resolveLocalFileSystemURL === "function") {
            window.resolveLocalFileSystemURL(
              imageUri,
              (entry) => {
                entry.file(
                  (file) => processPhotoSource(file),
                  () =>
                    showToast(
                      "File foto tidak dapat dibaca. Coba pilih foto dari galeri.",
                      "error",
                    ),
                );
              },
              () =>
                showToast(
                  "Lokasi foto tidak dapat dibuka. Pastikan cordova-plugin-file terpasang.",
                  "error",
                ),
            );
          } else {
            showToast(
              "Plugin file belum tersedia. Jalankan cordova plugin add cordova-plugin-file lalu build ulang.",
              "error",
            );
          }
        },
        (message) => {
          const text = String(message || "");

          if (!/cancel/i.test(text)) {
            showToast(
              "Kamera tidak dapat membuka foto. Coba galeri atau pilih file.",
              "error",
            );
          }
        },
        options,
      );
    } catch (error) {
      console.error("[Cordova Camera]", error);

      showToast(
        "Plugin kamera belum siap. Gunakan tombol Pilih foto.",
        "error",
      );
    }
  } else {
    if (sourceType === "camera") {
      showToast(
        "Kamera Cordova tidak aktif di browser. Pilih gambar; di HP kamu bisa memilih kamera dari pemilih foto.",
        "success",
      );
    }

    openFilePicker(sourceType);
  }
}

function csvCell(value) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const list = getFilteredItems();

  if (list.length === 0) {
    showToast(
      "Tidak ada barang untuk diekspor dengan filter saat ini.",
      "error",
    );

    return;
  }

  const headers = [
    "Nama Barang",
    "Nomor Seri",
    "Merek",
    "Kategori",
    "Ruangan",
    "Harga Beli (Rp)",
    "Tanggal Pembelian",
    "Garansi Berakhir",
    "Kondisi",
    "Catatan",
    "Foto Tersimpan",
  ];

  const rows = list.map((item) => [
    item.name,
    item.serial,
    item.brand,
    item.category,
    item.room,
    Number(item.price || 0),
    item.purchaseDate,
    item.warrantyDate,
    item.condition,
    item.notes,
    item.photo ? "Ya" : "Tidak",
  ]);

  const csv =
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;

    anchor.download = `katalog-inventaris-${new Date().toISOString().slice(0, 10)}.csv`;

    anchor.style.display = "none";

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1500);

    showToast(
      "File CSV sedang disiapkan. Foto tidak disertakan di file ekspor.",
      "success",
    );
  } catch (error) {
    console.error("[Ekspor CSV]", error);

    showToast(
      "Ekspor tidak berhasil di perangkat ini. Coba buka aplikasi melalui browser.",
      "error",
    );
  }
}

function clearFilters() {
  $("#inventory-search").value = "";
  $("#global-search").value = "";

  $("#filter-room").value = "";
  $("#filter-category").value = "";
  $("#filter-condition").value = "";

  $("#sort-by").value = "newest";

  renderInventory();
}

function handleDelegatedClick(event) {
  const deleteButton = event.target.closest('[data-action="delete-item"]');

  if (deleteButton) {
    event.preventDefault();
    deleteItem(deleteButton.dataset.id);
    return;
  }
  const viewButton = event.target.closest("[data-view]");

  if (viewButton) {
    setView(viewButton.dataset.view);
    return;
  }

  const viewLink = event.target.closest("[data-view-link]");

  if (viewLink) {
    event.preventDefault();

    setView(viewLink.dataset.viewLink);
    return;
  }

  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) return;

  const { action, id, room } = actionButton.dataset;

  if (action === "add-item") {
    openItemModal();
  } else if (action === "edit-item") {
    const item = items.find((candidate) => candidate.id === id);

    if (item) {
      openItemModal(item);
    }
  } else if (action === "delete-item") {
    deleteItem(id);
  } else if (action === "close-modal") {
    closeItemModal();
  } else if (action === "open-room") {
    selectedRoom = room || "";

    renderRoomDetail();

    $("#room-detail").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } else if (action === "view-item") {
    const item = items.find((candidate) => candidate.id === id);

    if (item) {
      openItemDetails(item);
    }
  } else if (action === "close-detail-modal") {
    closeItemDetails();
  }
}

function init() {
  // Dropdown ruangan dengan tema pink pastel
  const roomInput = $("#item-room");
  const roomMenu = $("#room-suggestions");
  const roomToggle = $("#room-suggestions-toggle");
  const roomOptions = $$(".room-option", roomMenu);

  function closeRoomMenu() {
    roomMenu.classList.add("hidden");
    roomInput.setAttribute("aria-expanded", "false");
    roomToggle.setAttribute("aria-expanded", "false");
  }

  function updateRoomMenu() {
    const query = roomInput.value.trim().toLocaleLowerCase("id-ID");
    let visibleCount = 0;

    roomOptions.forEach((option) => {
      const roomName = option.dataset.roomValue.toLocaleLowerCase("id-ID");
      const matches = roomName.includes(query);

      option.hidden = !matches;

      if (matches) visibleCount += 1;
    });

    const isOpen = visibleCount > 0;

    roomMenu.classList.toggle("hidden", !isOpen);
    roomInput.setAttribute("aria-expanded", String(isOpen));
    roomToggle.setAttribute("aria-expanded", String(isOpen));
  }

  roomInput.addEventListener("focus", updateRoomMenu);
  roomInput.addEventListener("input", updateRoomMenu);

  roomToggle.addEventListener("click", () => {
    if (roomMenu.classList.contains("hidden")) {
      roomInput.focus();
      updateRoomMenu();
    } else {
      closeRoomMenu();
    }
  });

  roomMenu.addEventListener("click", (event) => {
    const option = event.target.closest(".room-option");
    if (!option) return;

    roomInput.value = option.dataset.roomValue;
    closeRoomMenu();
    roomInput.dispatchEvent(new Event("change", { bubbles: true }));
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".room-field")) {
      closeRoomMenu();
    }
  });

  roomInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRoomMenu();
    }
  });
  ensureConfirmPasswordField();
  updateAuthModeUI();
  setupPasswordToggle($("#auth-password"));
  setupPasswordToggle($("#auth-confirm-password"));

  $("#auth-form").addEventListener("submit", handleAuthSubmit);

  $("#open-auth-form").addEventListener("click", () => {
    authMode = "login";
    showAuthForm(true);
  });

  $("#auth-mode-toggle").addEventListener("click", () => {
    authMode = authMode === "login" ? "register" : "login";

    updateAuthModeUI();

    $("#auth-error").textContent = "";
  });

  $("#guest-button").addEventListener("click", signInGuest);

  $("#signout-button").addEventListener("click", signOutUser);

  $("#mobile-account-button").addEventListener("click", signOutUser);

  $("#logout-cancel").addEventListener("click", closeLogoutModal);

  $("#logout-close").addEventListener("click", closeLogoutModal);

  $("#logout-confirm").addEventListener("click", confirmSignOut);

  $("#delete-cancel").addEventListener("click", closeDeleteConfirmModal);

  $("#delete-modal-close").addEventListener("click", closeDeleteConfirmModal);

  $("#delete-confirm").addEventListener("click", confirmDeleteItem);

  $("#delete-modal").addEventListener("click", (event) => {
    if (event.target.id === "delete-modal") {
      closeDeleteConfirmModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    const modal = $("#delete-modal");

    if (
      event.key === "Escape" &&
      modal &&
      !modal.classList.contains("hidden")
    ) {
      closeDeleteConfirmModal();
    }
  });

  $("#logout-modal").addEventListener("click", (event) => {
    if (event.target.id === "logout-modal") {
      closeLogoutModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    const modal = $("#logout-modal");

    if (
      event.key === "Escape" &&
      modal &&
      !modal.classList.contains("hidden")
    ) {
      closeLogoutModal();
    }
  });

  document.addEventListener("click", handleDelegatedClick);

  // Memberi notifikasi jika nomor seri sudah digunakan
  $("#item-serial").addEventListener("input", (event) => {
    const serialInput = event.target;

    const normalizedSerial = serialInput.value
      .trim()
      .toLocaleLowerCase("id-ID");

    const duplicate = normalizedSerial
      ? items.find(
          (item) =>
            item.id !== editingId &&
            String(item.serial || "")
              .trim()
              .toLocaleLowerCase("id-ID") === normalizedSerial,
        )
      : null;

    if (duplicate) {
      // Tampilkan notifikasi sekali untuk nomor yang sama
      if (serialInput.dataset.lastDuplicate !== normalizedSerial) {
        showToast(
          `Nomor seri sudah digunakan oleh barang "${duplicate.name}". Gunakan nomor seri yang berbeda.`,
          "error",
        );
      }

      serialInput.dataset.lastDuplicate = normalizedSerial;
    } else {
      serialInput.dataset.lastDuplicate = "";
    }
  });

  itemForm.addEventListener("submit", saveItem);

  itemModal.addEventListener("click", (event) => {
    if (event.target === itemModal) {
      closeItemModal();
    }
  });

  detailModal.addEventListener("click", (event) => {
    if (event.target === detailModal) {
      closeItemDetails();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (detailModal && !detailModal.classList.contains("hidden")) {
      closeItemDetails();
      return;
    }

    if (itemModal && !itemModal.classList.contains("hidden")) {
      closeItemModal();
    }
  });

  $("#camera-button").addEventListener("click", () =>
    captureOrChoosePhoto("camera"),
  );

  $("#gallery-button").addEventListener("click", () =>
    captureOrChoosePhoto("gallery"),
  );

  $("#photo-input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Pilih file gambar seperti JPG, PNG, atau WEBP.", "error");

      return;
    }

    await processPhotoSource(file);
  });

  $("#remove-photo-button")?.addEventListener("click", () => {
    photoDraft = "";

    setPhotoPreview("");

    showToast("Foto akan dihapus saat kamu menyimpan perubahan.", "success");
  });

  const searchToggle = $("#mobile-search-toggle");
  const searchWrap = searchToggle?.closest(".top-search");
  const globalSearch = $("#global-search");

  searchToggle?.addEventListener("click", () => {
    const isOpen = searchWrap.classList.toggle("is-open");

    searchToggle.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      globalSearch.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".top-search")) {
      searchWrap?.classList.remove("is-open");
      searchToggle?.setAttribute("aria-expanded", "false");
    }
  });

  $("#global-search").addEventListener("input", (event) => {
    $("#inventory-search").value = event.target.value;

    if (event.target.value.trim()) {
      setView("inventory");
    }

    renderInventory();
  });

  $("#inventory-search").addEventListener("input", (event) => {
    $("#global-search").value = event.target.value;

    renderInventory();
  });

  ["#filter-room", "#filter-category", "#filter-condition", "#sort-by"].forEach(
    (selector) => {
      $(selector).addEventListener("change", renderInventory);
    },
  );

  $("#clear-filters").addEventListener("click", clearFilters);

  $("#export-button").addEventListener("click", exportCsv);

  $("#close-room-detail").addEventListener("click", () => {
    selectedRoom = "";

    renderRoomDetail();
  });

  document.addEventListener("deviceready", () => {}, false);

  window.addEventListener("online", () =>
    showToast("Koneksi kembali tersedia.", "success"),
  );

  window.addEventListener("offline", () =>
    showToast(
      "Kamu sedang offline. Perubahan online mungkin gagal tersimpan.",
      "error",
    ),
  );

  onAuthStateChanged(
    auth,
    (user) => {
      currentUser = user;

      if (user) {
        // Jika pengguna sudah login, tampilkan halaman utama.
        showAppScreen();

        // Perbarui informasi akun.
        updateAccountUI();

        // Ambil data inventaris pengguna.
        listenToUserItems();
      } else {
        if (unsubscribeItems) {
          unsubscribeItems();
        }

        unsubscribeItems = null;

        items = [];
        selectedRoom = "";

        // Jika belum login, tampilkan halaman login.
        showAuthScreen();
      }
    },
    (error) => {
      console.error(
        "[Firebase Auth State]",
        error?.code || "tanpa-kode",
        error?.message || error,
      );

      showAuthScreen();

      $("#auth-error").textContent = errorMessage(
        error,
        "Firebase Authentication tidak dapat dimulai.",
      );
    },
  );
}

init();
