export const schoolInfo = {
  name: "Unique College of Health Science and Technology",
  shortName: "Unique College",
  abbreviation: "UCHST",
  location: "Kwali-Abuja",
  address: "R3W6+Q6X, Satellite Quarters, behind Police Station, Kwali, Kwali FCT-Abuja",
  email: "uniquecollegescience@gmail.com",
  phones: ["09092835595", "0813 531 2799"],
  phoneDisplay: "+234 909 283 5595, +234 813 531 2799",
  website: "www.uniquecollegekwali.com",
  motto: "Excellence in Impacting Knowledge",
  admissionSession: "2026/2027 academic session",
  established: "September 7, 2024",
  registrationNumber: "RC-7901067",
  approval:
    "Provisional approval from the Department of Higher Education FCT-Abuja, Ministry of Education-Nigeria.",
  about:
    "Unique College of Health Science and Technology is a private tertiary healthcare institution established on September 7, 2024, located at R3W6+Q6X, Satellite Quarters, behind Police Station, Kwali, Kwali FCT-Abuja.",
  identity:
    "The institution is approved by the Federal Government of Nigeria under the Company and Allied Matters Act 1990, as amended, with registration number RC-7901067.",
  philosophy:
    "To provide a functional in-depth and broad-based theoretical and practical knowledge of Primary Health Care Services and allied disciplines that will enable trained health care personnel to provide high-quality health care education and services in any community.",
  objective:
    "To train and produce healthcare personnel who are equipped with comprehensive theoretical knowledge and practical skills required for meaningful engagement in all areas of primary health care.",
  mission:
    "To provide students with excellent education, skills, and knowledge to excel in the field of Health Science and Technology.",
  vision:
    "To be a leading institution in Nigeria, producing expert, inventive, and responsible professionals.",
  profile:
    "Unique College of Health Science and Technology is dedicated to transforming lives through quality healthcare education. We stand as a beacon of academic excellence in Kwali-Abuja, preparing the next generation of health professionals committed to serving their communities with integrity and innovation."
};

export const anthem = {
  title: "Unique Anthem",
  verses: [
    [
      "In Kwali's heart we rise with light,",
      "A beacon shining strong and bright.",
      "With knowledge, skill, and noble aim,",
      "We serve mankind in health's great name."
    ],
    [
      "Through science, training, hands that heal,",
      "We pledge our strength, our love, our zeal.",
      "To every home, to every land,",
      "We bring good health with helping hand."
    ]
  ],
  chorus: [
    "Oh, Unique College of Health, Kwali, Abuja,",
    "We lift your banner high with pride.",
    "With wisdom, service, care, and honor,",
    "We stand for truth, with hope as a guide."
  ]
};

export const pledge = {
  title: "Unique Pledge",
  lines: [
    "We acknowledge the honor and values of Unique College of Health Science and Technology.",
    "We are committed to academic excellence, discipline, and continuous learning.",
    "At the Unique College of Health Science and Technology we impact knowledge and skills to promote quality healthcare, protect human life, and serve with compassion, integrity, and professionalism.",
    "We are committed and dedicated to train, to serve, and to uphold the standards of healthcare within and beyond the institution.",
    "Long Live Unique College of Health Science and Technology.",
    "Long Live the Federal Republic of Nigeria."
  ]
};

export const assetPaths = {
  logo: "/school-assets/logo.jpeg",
  admissionFlyer: "/school-assets/admission-open-2026.jpeg",
  programsFlyer: "/school-assets/programs-info.jpeg",
  campusWide: "/school-assets/campus-contact-wide.jpeg",
  campusContact: "/school-assets/campus-contact.jpeg",
  campusGate: "/school-assets/campus-gate.jpg",
  campusCourtyard: "/school-assets/campus-courtyard.jpg",
  classroomStudents: "/school-assets/classroom-students.jpg",
  studentLifeShirts: "/school-assets/student-life-shirts.jpg",
  officialVisitHall: "/school-assets/official-visit-hall.jpg",
  uniformGroupWide: "/school-assets/uniform-group-wide.jpg",
  uniformGroupPortrait: "/school-assets/uniform-group-portrait.jpg",
  uniformGroupSmall: "/school-assets/uniform-group-small.jpg",
  courtyardStudentLife: "/school-assets/courtyard-student-life.jpg",
  studentPortraitGroup: "/school-assets/student-portrait-group.jpg"
};

const generalRequirements =
  "Relevant O-Level credits including English, Mathematics, Biology, Chemistry, Physics, or related science subjects as applicable to the programme.";

export const programs = [
  {
    title: "Community Health Extension Workers (CHEW) ND",
    duration: "4 semesters",
    requirements: generalRequirements,
    summary:
      "National Diploma training for primary healthcare practice, community health service, prevention, and patient support."
  },
  {
    title: "Pharmacy Technician ND",
    duration: "4 semesters",
    requirements: generalRequirements,
    summary:
      "Training for pharmacy support practice, medicine handling, dispensing assistance, inventory, and patient-focused service."
  },
  {
    title: "Medical Laboratory Technician (MLT) ND",
    duration: "4 semesters",
    requirements: generalRequirements,
    summary:
      "Practical laboratory training for diagnostic support, specimen handling, basic analysis, and safe laboratory procedures."
  },
  {
    title: "Health Information Management (HIM) ND",
    duration: "4 semesters",
    requirements: generalRequirements,
    summary:
      "Training in health records, data handling, hospital information workflow, reporting, and digital health administration."
  },
  {
    title: "Public Health Science ND",
    duration: "4 semesters",
    requirements: generalRequirements,
    summary:
      "Public health training focused on prevention, health education, epidemiology basics, and community health systems."
  },
  {
    title: "Health Promotion Science ND",
    duration: "4 semesters",
    requirements: generalRequirements,
    summary:
      "Training for health awareness, behavior change communication, outreach planning, and community health promotion."
  }
];

export const stats = [
  [schoolInfo.registrationNumber, "Registered institution"],
  ["2026/2027", "Admission open"],
  ["6", "ND programmes"],
  ["4 semesters", "Programme duration"]
];

export const sampleNews = [
  {
    title: "Admission is open for the 2026/2027 academic session",
    excerpt:
      "Unique College of Health Science and Technology, Kwali-Abuja is accepting applications into CHEW, Pharmacy Technician, MLT, HIM, Public Health Science, and Health Promotion Science ND programmes."
  },
  {
    title: "Applications are received online",
    excerpt:
      "Prospective students should complete every required field, upload a clear passport photograph, and watch their email or phone for admission updates."
  }
];

export const officialGallery = [
  ["Campus entrance", "Campus", assetPaths.campusGate],
  ["Campus courtyard", "Campus", assetPaths.campusCourtyard],
  ["Classroom learning", "Academic life", assetPaths.classroomStudents],
  ["Student life", "Campus life", assetPaths.studentLifeShirts],
  ["Official visit", "Leadership", assetPaths.officialVisitHall],
  ["Health science students", "Students", assetPaths.uniformGroupWide],
  ["Student group", "Students", assetPaths.uniformGroupPortrait],
  ["Clinical training group", "Students", assetPaths.uniformGroupSmall],
  ["Courtyard activities", "Campus life", assetPaths.courtyardStudentLife],
  ["Student ambassadors", "Campus life", assetPaths.studentPortraitGroup]
];

export const imagery = {
  hero: assetPaths.uniformGroupWide,
  about: assetPaths.campusGate,
  campus: assetPaths.campusCourtyard,
  classroom: assetPaths.classroomStudents,
  students: assetPaths.uniformGroupWide,
  studentLife: assetPaths.courtyardStudentLife,
  leadership: assetPaths.officialVisitHall
};
