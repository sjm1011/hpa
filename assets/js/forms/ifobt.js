"use strict";

const institution = HealthApp.config.institution;

const form = document.getElementById("ifobtForm");
const completeButton = document.getElementById("completeButton");
const printButton = document.getElementById("printButton");
const completionStatus = document.getElementById("completionStatus");
const validationMessage = document.getElementById("validationMessage");
const identityInput = document.getElementById("identityNumber");
const identityBoxes = document.getElementById("identityBoxes");
const smokingAgeField = document.getElementById("smokingAgeField");
const smokingStartAge = document.getElementById("smokingStartAge");
const runtime = HealthApp.formRuntime.create({
  form,
  completeButton,
  printButton,
  completionStatus,
  validationMessage
});
const {
  getRadioValue,
  getValue,
  numbersOnly,
  setError,
  clearFieldErrorForElement,
  clearValidationPresentation,
  presentFirstValidationError,
  rocDateParts,
  isValidRocDate,
  rocDateToDate,
  calculateCurrentAge,
  setCompletionState,
  invalidateCompletion,
  escapeHtml
} = runtime;

document.getElementById("institutionDisplay").textContent =
  `${institution.name} ${institution.code}`;

for (let index = 0; index < 10; index += 1) {
  const box = document.createElement("span");
  box.className = "id-box";
  identityBoxes.appendChild(box);
}

function updateIdentityBoxes() {
  const value = identityInput.value;
  [...identityBoxes.children].forEach((box, index) => {
    box.textContent = value[index] || "";
  });
}

function validatePhoneGroup(errors) {
  const area = getValue("phoneArea");
  const phone = getValue("phoneNumber");
  const mobile = getValue("mobilePhone");

  let phoneError = "";
  let mobileError = "";

  if (!area && !phone && !mobile) {
    phoneError = "聯絡電話與手機至少必須填寫一項。";
    mobileError = "聯絡電話與手機至少必須填寫一項。";
  } else {
    if (area || phone) {
      if (!/^\d{2,3}$/.test(area) || !/^\d{7,8}$/.test(phone)) {
        phoneError = "請同時填寫 2 至 3 碼區域碼及 7 至 8 碼電話號碼。";
      }
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      mobileError = "手機必須為 10 碼半形數字。";
    }
  }

  setError("phoneContact", phoneError);
  setError("mobilePhone", mobileError);
  if (phoneError) errors.push("phoneContact");
  if (mobileError) errors.push("mobilePhone");
}

function validateRequiredRadio(errors, fieldName, message) {
  const invalid = !getRadioValue(fieldName);
  setError(fieldName, invalid ? message : "");
  if (invalid) errors.push(fieldName);
}

function validateForm() {
  const errors = [];

  validateRequiredRadio(errors, "paymentMethod", "請選擇支付方式。");
  validateRequiredRadio(errors, "screeningLocation", "請選擇篩檢地點。");

  const nameInvalid = !getValue("fullName");
  setError("fullName", nameInvalid ? "請填寫姓名。" : "");
  if (nameInvalid) errors.push("fullName");

  validateRequiredRadio(errors, "gender", "請選擇性別。");

  const birthParts = rocDateParts("birth");
  let birthError = "";
  if (!getValue("birthYear") || !getValue("birthMonth") || !getValue("birthDay")) {
    birthError = "請完整填寫出生日期。";
  } else if (!isValidRocDate(birthParts)) {
    birthError = "出生日期不是有效日期。";
  } else if (rocDateToDate(birthParts) > new Date()) {
    birthError = "出生日期不得晚於今天。";
  }
  setError("birthDate", birthError);
  if (birthError) errors.push("birthDate");

  const identityInvalid = !/^[A-Z0-9]{10}$/.test(getValue("identityNumber"));
  setError("identityNumber", identityInvalid ? "身分證號 / 統一證號 (外籍) 必須填滿 10 碼半形英數。" : "");
  if (identityInvalid) errors.push("identityNumber");

  validatePhoneGroup(errors);

  const districtInvalid = !/^\d{3,6}$/.test(getValue("districtCode"));
  setError("districtCode", districtInvalid ? "鄉鎮市區代碼必須為 3 至 6 碼半形數字。" : "");
  if (districtInvalid) errors.push("districtCode");

  const addressInvalid = !getValue("address");
  setError("address", addressInvalid ? "請填寫現居住地址。" : "");
  if (addressInvalid) errors.push("address");

  validateRequiredRadio(errors, "education", "請選擇教育程度。");
  validateRequiredRadio(errors, "smokingHistory", "請選擇吸菸史。");

  if (getRadioValue("smokingHistory") === "1") {
    const ageText = getValue("smokingStartAge");
    let ageError = "";
    if (!/^\d+$/.test(ageText) || Number(ageText) < 1) {
      ageError = "開始吸菸年齡必須為大於或等於 1 的半形整數。";
    } else if (!birthError) {
      const currentAge = calculateCurrentAge(rocDateToDate(birthParts));
      if (Number(ageText) > currentAge) {
        ageError = `開始吸菸年齡不得大於目前年齡 ${currentAge} 歲。`;
      }
    }
    setError("smokingStartAge", ageError);
    if (ageError) errors.push("smokingStartAge");
  } else {
    setError("smokingStartAge", "");
  }

  validateRequiredRadio(errors, "colorectalFamilyHistory", "請選擇大腸直腸癌家族病史。");
  validateRequiredRadio(errors, "otherCancerFamilyHistory", "請選擇其他癌症家族病史。");
  validateRequiredRadio(errors, "hasSymptoms", "請選擇有無腸道不適症狀。");

  const visitParts = rocDateParts("visit");
  let visitError = "";
  if (!getValue("visitYear") || !getValue("visitMonth") || !getValue("visitDay")) {
    visitError = "請完整填寫門診日期。";
  } else if (!isValidRocDate(visitParts)) {
    visitError = "門診日期不是有效日期。";
  }
  setError("visitDate", visitError);
  if (visitError) errors.push("visitDate");

  return errors;
}

function setTodayAsVisitDate() {
  const today = new Date();
  document.getElementById("visitYear").value = String(today.getFullYear() - 1911);
  document.getElementById("visitMonth").value = String(today.getMonth() + 1);
  document.getElementById("visitDay").value = String(today.getDate());
}

function toggleSmokingAge() {
  const show = getRadioValue("smokingHistory") === "1";
  smokingAgeField.hidden = !show;
  if (!show) {
    smokingStartAge.value = "";
    setError("smokingStartAge", "");
  }
}

function option(code, label, selectedCode) {
  return `<span class="print-check">${selectedCode === code ? "✓" : ""}</span>${label}`;
}

function printIdentityBoxes(value) {
  return [...Array(10)].map((_, index) =>
    `<span class="print-id-box">${escapeHtml(value[index] || "")}</span>`
  ).join("");
}

function formatDistrictCode(value) {
  const first = value.slice(0, 3).padEnd(3, "□");
  const second = value.slice(3, 6).padEnd(3, "□");
  return `${first}-${second}`;
}

function collectFormData() {
  return {
    paymentMethod: getRadioValue("paymentMethod"),
    screeningLocation: getRadioValue("screeningLocation"),
    fullName: getValue("fullName"),
    gender: getRadioValue("gender"),
    birthYear: getValue("birthYear"),
    birthMonth: getValue("birthMonth"),
    birthDay: getValue("birthDay"),
    identityNumber: getValue("identityNumber"),
    phoneArea: getValue("phoneArea"),
    phoneNumber: getValue("phoneNumber"),
    mobilePhone: getValue("mobilePhone"),
    districtCode: getValue("districtCode"),
    address: getValue("address"),
    education: getRadioValue("education"),
    smokingHistory: getRadioValue("smokingHistory"),
    smokingStartAge: getValue("smokingStartAge"),
    colorectalFamilyHistory: getRadioValue("colorectalFamilyHistory"),
    otherCancerFamilyHistory: getRadioValue("otherCancerFamilyHistory"),
    hasSymptoms: getRadioValue("hasSymptoms"),
    visitYear: getValue("visitYear"),
    visitMonth: getValue("visitMonth"),
    visitDay: getValue("visitDay")
  };
}

function createFormRequest(requestId) {
  return HealthApp.formService.createRequest({
    formType: form.dataset.formType,
    formVersion: form.dataset.formVersion,
    requestId,
    data: collectFormData()
  });
}

function buildPrintPage(copyLabel, data) {
  const paymentOptions = [
    ["1", "(1)預防保健"], ["3", "(3)健保醫療給付"],
    ["4", "(4)其他公務預算補助"], ["5", "(5)自費健康檢查"], ["9", "(9)其他"]
  ].map(([code, label]) => option(code, label, data.paymentMethod)).join("；");

  const locationOptions = [
    ["1", "(1)社區或職場設站篩檢"], ["2", "(2)門診"], ["3", "(3)住院"],
    ["4", "(4)郵寄"], ["5", "(5)其他"]
  ].map(([code, label]) => option(code, label, data.screeningLocation)).join("；");

  const educationOptions = [
    ["1", "(1)無"], ["2", "(2)小學"], ["3", "(3)國（初）中"], ["4", "(4)高中（職）"],
    ["5", "(5)專科、大學"], ["6", "(6)研究所以上"], ["7", "(7)拒答"]
  ].map(([code, label]) => option(code, label, data.education)).join("；");

  return `
    <section class="print-page">
      <div class="print-meta"><span>附表五之四</span><span class="print-funding">本檢查經費「由衛生福利部國民健康署運用菸品健康福利捐／公務預算補助」</span></div>
      <h1 class="print-title">健康署定量免疫法糞便潛血檢查服務檢查紀錄結果表單</h1>
      <div class="copy-label">${escapeHtml(copyLabel)}</div>

      <div class="print-line">支付方式：${paymentOptions}</div>
      <div class="print-line">篩檢地點：${locationOptions}</div>

      <div class="print-section-title">基本資料</div>
      <div class="print-grid">
        <div class="print-span-5">姓名：<span class="print-value long">${escapeHtml(data.fullName)}</span></div>
        <div class="print-span-3">性別：${option("M", "男", data.gender)} ${option("F", "女", data.gender)}</div>
        <div class="print-span-4">出生日期：民國 <span class="print-value">${escapeHtml(data.birthYear)}</span> 年 <span class="print-value">${escapeHtml(data.birthMonth)}</span> 月 <span class="print-value">${escapeHtml(data.birthDay)}</span> 日</div>
        <div class="print-span-6">身分證統一編號／統一證號（外籍）：<span class="print-id-boxes">${printIdentityBoxes(data.identityNumber)}</span></div>
        <div class="print-span-6">聯絡電話：（<span class="print-value">${escapeHtml(data.phoneArea)}</span>）<span class="print-value">${escapeHtml(data.phoneNumber)}</span>　手機：<span class="print-value">${escapeHtml(data.mobilePhone)}</span></div>
        <div class="print-span-12">現居住地址（鄉鎮市區代碼：${escapeHtml(formatDistrictCode(data.districtCode))}）<div class="print-address">${escapeHtml(data.address)}</div></div>
        <div class="print-span-12">教育：${educationOptions}</div>
      </div>

      <div class="print-section-title">家族病史及吸菸習慣</div>
      <div class="print-line">1. 吸菸史：${option("0", "無", data.smokingHistory)}；${option("1", "有（含已戒菸）", data.smokingHistory)}，開始吸菸年齡：<span class="print-value">${escapeHtml(data.smokingStartAge)}</span> 歲。</div>
      <div class="print-line">2. 請問與您有血緣的父母、兄弟姊妹或子女或其他親屬有無得過大腸直腸癌？${option("0", "(0)無", data.colorectalFamilyHistory)}；${option("1", "(1)有", data.colorectalFamilyHistory)}；${option("2", "(2)不知道", data.colorectalFamilyHistory)}。</div>
      <div class="print-line">3. 請問與您有血緣的父母、兄弟姊妹或子女或其他親屬有無得過其他癌症？${option("0", "(0)無", data.otherCancerFamilyHistory)}；${option("1", "(1)有", data.otherCancerFamilyHistory)}；${option("2", "(2)不知道", data.otherCancerFamilyHistory)}。</div>
      <div class="print-line">以上如有任一項填寫「有」，請繼續填寫附表五之六。</div>

      <div class="print-section-title">有無症狀</div>
      <div class="print-line">請問您有無腸道不適症狀？如腹瀉、便祕、糞便變細、排泄黏液、便血、黃色帶血或其他症狀 ${option("0", "(0)無", data.hasSymptoms)}；${option("1", "(1)有", data.hasSymptoms)}。</div>
      <div class="print-consent">＊本人同意接受糞便潛血檢查，本表資料將作為衛生及學術單位進行個案追蹤關懷及健康管理、資格檢核、比對連結、統計分析、政策評估及其他相關目的使用。</div>
      <div class="print-line">確認以上資料正確無誤：<span class="blank-line"></span>（簽名）</div>

      <div class="print-section-title">個案檢查情形</div>（檢查醫療院所）
      <div class="print-line">檢查醫療院所名稱及代碼：<span class="print-value long">${escapeHtml(institution.name)} ${escapeHtml(institution.code)}</span>，門診日期：民國 <span class="print-value">${escapeHtml(data.visitYear)}</span> 年 <span class="print-value">${escapeHtml(data.visitMonth)}</span> 月 <span class="print-value">${escapeHtml(data.visitDay)}</span> 日。</div>

      <div class="print-section-title">糞便潛血檢查結果</div>（糞便潛血檢驗機構填寫）
      <div class="print-result-row">1. 醫事檢驗機構／醫療院所名稱及代碼：<span class="blank-line is-extra-wide"></span></div>
      <div class="print-result-row">2. 檢驗日期：民國 <span class="blank-line"></span> 年 <span class="blank-line"></span> 月 <span class="blank-line"></span> 日。</div>
      <div class="print-result-row">3. 檢驗結果：${option("", "(0)陰性", "x")} ${option("", "(1)陽性", "x")}，數值：<span class="blank-line"></span>。</div>
      <div class="print-result-row">4. 定量試劑商品名稱：${option("", "(0)Eiken", "x")}，${option("", "(2)其他", "x")}，${option("", "(3)Kyowa（HM-JACKarc）", "x")}。</div>

      <div class="print-section-title">個案確診結果</div>
      <div class="print-result-row">1. 前項檢查陽性個案於檢查後三個月內有沒有接受後續確診？${option("", "(0)沒有", "x")}；${option("", "(1)有", "x")}。</div>
      <div class="print-result-row">2. 沒有接受確診理由為：${option("", "(1)無法聯繫", "x")}，${option("", "(2)出國", "x")}，${option("", "(3)搬家", "x")}，${option("", "(4)死亡", "x")}，${option("", "(5)拒做", "x")}，${option("", "(6)其他", "x")}。</div>
      <div class="print-result-row">3. 確診醫療院所名稱及代碼：<span class="blank-line is-wide"></span>，確診日期：民國 <span class="blank-line"></span> 年 <span class="blank-line"></span> 月 <span class="blank-line"></span> 日。</div>
      <div class="print-result-row">4. 檢查方法：${option("", "(1)大腸鏡", "x")}，${option("", "(9)其他", "x")}。</div>
      <div class="print-result-row">5. 診斷：${option("", "(0)正常", "x")}，${option("", "(1)痔瘡", "x")}，${option("", "(2)潰瘍性大腸炎", "x")}，${option("", "(3)息肉", "x")}，${option("", "(4)大腸癌", "x")}，${option("", "(9)其他", "x")}。</div>
      <div class="print-result-row">＊如有息肉，息肉有無切除：${option("", "(1)未切除", "x")} ${option("", "(2)已完全切除", "x")} ${option("", "(3)未完全切除", "x")}。</div>
      <div class="print-footer">（114 年 1 月修訂）</div>
    </section>`;
}

function preparePrint() {
  const data = collectFormData();
  document.getElementById("printRoot").innerHTML =
    buildPrintPage("第一聯：存檢查醫療機構", data) +
    buildPrintPage("第二聯：診及治療醫院", data);
}

function completeForm() {
  setCompletionState(false);
  const errors = validateForm();
  if (errors.length > 0) {
    presentFirstValidationError(errors[0]);
    return;
  }
  setCompletionState(true);
  completionStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

completeButton.addEventListener("click", completeForm);

form.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

  if (["birthYear", "birthMonth", "birthDay", "visitYear", "visitMonth", "visitDay",
       "phoneArea", "phoneNumber", "mobilePhone", "districtCode", "smokingStartAge"].includes(target.id)) {
    numbersOnly(target);
  }

  if (target === identityInput) {
    target.value = target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    updateIdentityBoxes();
  }

  clearFieldErrorForElement(target);
  clearValidationPresentation();
  invalidateCompletion();
});

form.addEventListener("change", (event) => {
  clearFieldErrorForElement(event.target);
  clearValidationPresentation();
  if (event.target.name === "smokingHistory") toggleSmokingAge();
  invalidateCompletion();
});

printButton.addEventListener("click", () => {
  if (!runtime.isComplete()) return;
  preparePrint();
  window.print();
});

window.addEventListener("beforeprint", () => {
  if (runtime.isComplete()) preparePrint();
});

setTodayAsVisitDate();
updateIdentityBoxes();
toggleSmokingAge();
runtime.installKeyboardNavigation();
requestAnimationFrame(() => {
  form.querySelector('input[name="paymentMethod"][value="1"]').focus({ preventScroll: true });
});

HealthApp.forms = HealthApp.forms || {};
HealthApp.forms.ifobt = Object.freeze({
  collectData: collectFormData,
  createRequest: createFormRequest
});
