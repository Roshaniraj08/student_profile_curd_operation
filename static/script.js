const studentForm = document.querySelector("#studentForm");
const searchForm = document.querySelector("#searchForm");
const submitButton = document.querySelector("#submitButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const formMessage = document.querySelector("#formMessage");
const searchMessage = document.querySelector("#searchMessage");
const studentCard = document.querySelector("#studentCard");
const editButton = document.querySelector("#editButton");
const deleteButton = document.querySelector("#deleteButton");

let fetchedStudent = null;
let editRollNo = null;

function getFormData() {
  return {
    name: document.querySelector("#name").value.trim(),
    roll_no: document.querySelector("#roll_no").value.trim(),
    mobile: document.querySelector("#mobile").value.trim(),
    email: document.querySelector("#email").value.trim(),
    student_class: document.querySelector("#student_class").value.trim(),
  };
}

function fillForm(student) {
  document.querySelector("#name").value = student.name;
  document.querySelector("#roll_no").value = student.roll_no;
  document.querySelector("#mobile").value = student.mobile;
  document.querySelector("#email").value = student.email;
  document.querySelector("#student_class").value = student.student_class;
}

function resetForm() {
  studentForm.reset();
  editRollNo = null;
  submitButton.textContent = "Submit";
  cancelEditButton.classList.add("hidden");
}

function showMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function showStudentCard(student) {
  fetchedStudent = student;
  document.querySelector("#cardName").textContent = student.name;
  document.querySelector("#cardRollNo").textContent = student.roll_no;
  document.querySelector("#cardMobile").textContent = student.mobile;
  document.querySelector("#cardEmail").textContent = student.email;
  document.querySelector("#cardClass").textContent = student.student_class;
  studentCard.classList.remove("hidden");
}

function hideStudentCard() {
  fetchedStudent = null;
  studentCard.classList.add("hidden");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("Server returned an invalid response. Please open the app on http://127.0.0.1:5001.");
    }
  } else if (!response.ok) {
    throw new Error("Server returned an empty error response. Please open the app on http://127.0.0.1:5001.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const student = getFormData();

  try {
    const isEditing = Boolean(editRollNo);
    const url = isEditing ? `/api/students/${encodeURIComponent(editRollNo)}` : "/api/students";
    const method = isEditing ? "PUT" : "POST";
    const data = await requestJson(url, {
      method,
      body: JSON.stringify(student),
    });

    showMessage(formMessage, data.message, "success");
    resetForm();
    showStudentCard(data.student);
    document.querySelector("#searchRollNo").value = data.student.roll_no;
  } catch (error) {
    showMessage(formMessage, error.message, "error");
  }
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rollNo = document.querySelector("#searchRollNo").value.trim();

  try {
    const data = await requestJson(`/api/students/${encodeURIComponent(rollNo)}`);
    showStudentCard(data.student);
    showMessage(searchMessage, "Student profile fetched.", "success");
  } catch (error) {
    hideStudentCard();
    showMessage(searchMessage, error.message, "error");
  }
});

editButton.addEventListener("click", () => {
  if (!fetchedStudent) {
    return;
  }

  fillForm(fetchedStudent);
  editRollNo = fetchedStudent.roll_no;
  submitButton.textContent = "Update";
  cancelEditButton.classList.remove("hidden");
  showMessage(formMessage, "Edit the details and click Update.", "");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

deleteButton.addEventListener("click", async () => {
  if (!fetchedStudent) {
    return;
  }

  const rollNo = fetchedStudent.roll_no;
  const confirmed = window.confirm(`Delete student with roll no. ${rollNo}?`);
  if (!confirmed) {
    return;
  }

  try {
    const data = await requestJson(`/api/students/${encodeURIComponent(rollNo)}`, {
      method: "DELETE",
    });
    hideStudentCard();
    resetForm();
    document.querySelector("#searchRollNo").value = "";
    showMessage(searchMessage, data.message, "success");
  } catch (error) {
    showMessage(searchMessage, error.message, "error");
  }
});

cancelEditButton.addEventListener("click", () => {
  resetForm();
  showMessage(formMessage, "Edit cancelled.", "");
});
