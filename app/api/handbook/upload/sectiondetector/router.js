/* ============================================================
   sectionDetector.js
   Full Section Title Detection for STI 2025 Student Handbook
   Used by: /api/handbook/upload
============================================================ */

/* ========== Helper: Detect Exact Section Header ========== */
export function detectSectionHeader(line) {
  line = line.trim();

  // ==== GENERAL INFORMATION ====
  if (/^STI History/i.test(line)) return "General Information – STI History";
  if (/^STI Vision/i.test(line)) return "General Information – Vision";
  if (/^STI Mission/i.test(line)) return "General Information – Mission";
  if (/Academic Seal/i.test(line)) return "General Information – Academic Seal";

  // ==== ACADEMIC POLICIES & PROCEDURES ====
  if (/Admission Policy/i.test(line)) return "Academic Policies – Admission Policies";
  if (/Freshmen Requirements/i.test(line)) return "Academic Policies – Freshmen Requirements";
  if (/Transferee Requirements/i.test(line)) return "Academic Policies – Transferee Requirements";
  if (/ALS A&E/i.test(line)) return "Academic Policies – ALS A&E Requirements";
  if (/Foreign School/i.test(line)) return "Academic Policies – Foreign Students";
  if (/Legal Contract/i.test(line)) return "Academic Policies – Legal Contract";
  if (/Refunds and Charges/i.test(line)) return "Academic Policies – Refunds and Charges";
  if (/Course\(s\) Dropping/i.test(line)) return "Academic Policies – Course Dropping";
  if (/Academic Honors/i.test(line)) return "Academic Policies – Academic Honors";
  if (/Graduation/i.test(line)) return "Academic Policies – Graduation Policies";

  // ==== STUDENT SERVICES ====
  if (/Guidance & Counseling/i.test(line)) return "Student Services – Guidance & Counseling";
  if (/ICT Services/i.test(line)) return "Student Services – ICT Services";
  if (/Library Services/i.test(line)) return "Student Services – Library Services";
  if (/Sports Development/i.test(line)) return "Student Services – Sports Development";
  if (/Health Services/i.test(line)) return "Student Services – Health Services";
  if (/Student Affairs Services/i.test(line)) return "Student Services – Student Affairs Services";
  if (/Alumni Services/i.test(line)) return "Student Services – Alumni Services";
  if (/I-CARE System/i.test(line)) return "Student Services – I-CARE Employment System";

  // ==== STUDENT BEHAVIOR & DISCIPLINE ====
  if (/Student Appearance/i.test(line)) return "Discipline – Student Appearance";
  if (/School Identification Card/i.test(line)) return "Discipline – School ID Policies";
  if (/Uniform Policies/i.test(line)) return "Discipline – Uniform Policies";
  if (/Student Decorum/i.test(line)) return "Discipline – Student Decorum";
  if (/Anti-Bullying/i.test(line)) return "Discipline – Anti-Bullying Policy";
  if (/Anti-Hazing/i.test(line)) return "Discipline – Anti-Hazing Policy";
  if (/Anti-Sexual Harassment/i.test(line)) return "Discipline – Anti-Sexual Harassment Policy";
  if (/Smoking, Vaping/i.test(line)) return "Discipline – Smoking & Vaping Policy";
  if (/Electronic Gadget Rule/i.test(line)) return "Discipline – Electronic Gadget Rule";
  if (/Social Media Policy/i.test(line)) return "Discipline – Social Media Policy";
  if (/Data Privacy Policy/i.test(line)) return "Discipline – Data Privacy Policy";
  if (/Student Discipline/i.test(line)) return "Discipline – Student Discipline Procedures";
  if (/Corrective Actions/i.test(line)) return "Discipline – Corrective Actions";

  // ==== OFFENSES ====
  if (/Minor Offenses/i.test(line)) return "Offenses – Minor Offenses";

  // Match variants like:
  // Major Offenses- Category A
  // Major Offenses - Category A
  // Major Offenses – Category A
  if (/Major Offenses.*Category A/i.test(line)) return "Offenses – Major Offenses (Category A)";
  if (/Major Offenses.*Category B/i.test(line)) return "Offenses – Major Offenses (Category B)";
  if (/Major Offenses.*Category C/i.test(line)) return "Offenses – Major Offenses (Category C)";
  if (/Major Offenses.*Category D/i.test(line)) return "Offenses – Major Offenses (Category D)";

  if (/Offenses Not Written/i.test(line)) return "Offenses – Not Written in Handbook";

  // ==== APPENDICES ====
  if (/Appendix A/i.test(line)) return "Appendix – STIer's Creed";
  if (/Appendix B/i.test(line)) return "Appendix – STI Hymn";
  if (/Appendix C/i.test(line)) return "Appendix – Student Commitment Form";

  return null;
}

/* ========== Detect Section Title Anywhere in Chunk ========== */
export function detectSectionTitle(text) {
  const lines = text.split("\n");

  for (let line of lines) {
    const header = detectSectionHeader(line);
    if (header) return header;
  }

  return null;
}
