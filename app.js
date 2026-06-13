// 1. Add 'deleteDoc' and 'doc' to your Firestore imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCLLUH7FCPj9RXie10mw4AB9t5Ak1zpNM",
  authDomain: "registration-3ecfe.firebaseapp.com",
  projectId: "registration-3ecfe",
  storageBucket: "registration-3ecfe.firebasestorage.app",
  messagingSenderId: "447049285614",
  appId: "1:447049285614:web:18ea648ae54d7c0d25d8ff",
  measurementId: "G-TG230G42QF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let registrations = [];
let activeCategoryTab = "Below 7";
let activeGenderFilter = "All";
const categories = ['Below 7', '7 to 12', 'Youth', 'Veteran'];

// DOM Elements
const regForm = document.getElementById('reg-form');
const nameInput = document.getElementById('name');
const successMsg = document.getElementById('success-msg');
const errorMsg = document.getElementById('error-msg');
const tableBody = document.getElementById('table-body');
const metricsBody = document.getElementById('metrics-body');
const metricsChips = document.getElementById('metrics-summary-chips');
const tabButtons = document.querySelectorAll('.tab-btn');
const copyNamesBtn = document.getElementById('copy-names-btn');
const thAction = document.getElementById('th-action'); // Admin header element

// Page Views
const pageReg = document.getElementById('page-registration');
const pageDash = document.getElementById('page-dashboard');
const btnGoToDashboard = document.getElementById('go-to-dashboard');
const btnGoToReg = document.getElementById('go-to-reg');

// ================= ADMIN ROLE CHECK =================
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('role') === 'admin';

// Show the "Action" header column instantly if admin is true
if (isAdmin) {
  thAction.style.display = 'table-cell';
}
// ====================================================

btnGoToDashboard.addEventListener('click', () => {
  pageReg.classList.remove('active');
  pageDash.classList.add('active');
});

btnGoToReg.addEventListener('click', () => {
  pageDash.classList.remove('active');
  pageReg.classList.add('active');
});

// Real-time Sync Listener
onSnapshot(collection(db, "registrations"), (snapshot) => {
  registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  calculateMetrics();
  renderTable();
});

// Form Submission Manager
regForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  successMsg.style.display = 'none';

  const nameValue = nameInput.value.trim();
  const selectedGender = document.querySelector('input[name="gender"]:checked').value;
  const selectedCategory = document.querySelector('input[name="category"]:checked').value;
  
  const alphabetRegex = /^[A-Za-z\s]+$/;
  if (!alphabetRegex.test(nameValue)) {
    errorMsg.textContent = 'Name must contain only alphabets!';
    return;
  }

  try {
    await addDoc(collection(db, "registrations"), {
      name: nameValue,
      gender: selectedGender,
      category: selectedCategory,
      createdAt: new Date()
    });
    
    nameInput.value = '';
    successMsg.textContent = 'Registration submitted successfully!';
    successMsg.style.display = 'block';
    setTimeout(() => { successMsg.style.display = 'none'; }, 4000);
  } catch (err) {
    console.error(err);
    errorMsg.textContent = 'Failed saving record to Firebase.';
  }
});

// Metrics Generator
function calculateMetrics() {
  metricsBody.innerHTML = '';
  let globalMale = 0;
  let globalFemale = 0;

  categories.forEach(cat => {
    const maleCount = registrations.filter(u => u.category === cat && u.gender === 'Male').length;
    const femaleCount = registrations.filter(u => u.category === cat && u.gender === 'Female').length;
    const grandTotal = maleCount + femaleCount;

    globalMale += maleCount;
    globalFemale += femaleCount;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cat}</td>
      <td>${maleCount}</td>
      <td>${femaleCount}</td>
      <td><strong>${grandTotal}</strong></td>
    `;
    metricsBody.appendChild(row);
  });

  metricsChips.innerHTML = `
    <span class="chip chip-total">Total: ${globalMale + globalFemale}</span>
  `;
}

function getCurrentFilteredData() {
  return registrations.filter(user => {
    const matchesCategory = user.category === activeCategoryTab;
    const matchesGender = activeGenderFilter === 'All' ? true : user.gender === activeGenderFilter;
    return matchesCategory && matchesGender;
  });
}

// Table Rendering Engine (Updated with dynamic admin controls)
function renderTable() {
  tableBody.innerHTML = '';
  const filteredData = getCurrentFilteredData();
  const totalColumns = isAdmin ? 4 : 3;

  if (filteredData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${totalColumns}" style="text-align:center; color:#999;">No entries found matching criteria.</td></tr>`;
    return;
  }

  filteredData.forEach((user, index) => {
    const row = document.createElement('tr');
    
    // Core structural columns
    let rowContent = `
      <td>${index + 1}</td>
      <td>${user.name}</td>
      <td>${user.gender}</td>
    `;

    // Append delete button cell explicitly if URL validation passes
    if (isAdmin) {
      rowContent += `<td><button class="btn-delete" data-id="${user.id}">Delete</button></td>`;
    }

    row.innerHTML = rowContent;
    tableBody.appendChild(row);
  });

  // Attach execution click listeners to the generated delete buttons
  if (isAdmin) {
    document.querySelectorAll('.btn-delete').forEach(button => {
      button.addEventListener('click', async (e) => {
        const docId = e.target.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this registration?")) {
          try {
            await deleteDoc(doc(db, "registrations", docId));
          } catch (err) {
            console.error("Error deleting document: ", err);
            alert("Failed to delete the entry from Firestore.");
          }
        }
      });
    });
  }
}

// Category Tabs Controls
tabButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    activeCategoryTab = e.target.getAttribute('data-category');
    renderTable();
  });
});

// Inline Radio Filter Configuration
document.querySelectorAll('input[name="gender-filter"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    activeGenderFilter = e.target.value;
    renderTable();
  });
});

// Copy to Clipboard
copyNamesBtn.addEventListener('click', () => {
  const targetList = getCurrentFilteredData();
  if (targetList.length === 0) {
    alert("No names to copy from this view.");
    return;
  }
  const newlineSeparatedNames = targetList.map(user => user.name).join('\n');
  navigator.clipboard.writeText(newlineSeparatedNames)
    .then(() => {
      const originalText = copyNamesBtn.innerHTML;
      copyNamesBtn.innerHTML = "✅ Copied!";
      setTimeout(() => { copyNamesBtn.innerHTML = originalText; }, 2000);
    })
    .catch(err => console.error('Could not copy text: ', err));
});
