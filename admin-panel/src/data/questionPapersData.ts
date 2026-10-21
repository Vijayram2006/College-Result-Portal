import { cachedQuestionPapers } from "../services/questionPapersApi";

export type HierarchyRole = "Faculty" | "HOD" | "AD" | "COE" | "Chief COE";
export type HierarchyStageNumber = 1 | 2 | 3 | 4 | 5;

export interface StageSignature {
  stageNumber: HierarchyStageNumber;
  stageRole: HierarchyRole;
  officerTitle: string;
  officerName: string;
  status: "COMPLETED" | "CURRENT" | "PENDING" | "RETURNED";
  timestamp?: string;
  sealOrReference?: string;
  remarks?: string;
}

export interface QuestionPartAItem {
  qNo: number;
  text: string;
  co: string;
  bloom: string;
  marks: number;
}

export interface QuestionPartBItem {
  qNo: number;
  optionA: {
    text: string;
    co: string;
    bloom: string;
    marks: number;
    subdivisions?: string[];
  };
  optionB: {
    text: string;
    co: string;
    bloom: string;
    marks: number;
    subdivisions?: string[];
  };
}

export interface QuestionPartCItem {
  qNo: number;
  text: string;
  co: string;
  bloom: string;
  marks: number;
  rubricHint: string;
}

export interface PdfAttachment {
  fileName: string;
  fileSize: string;
  fileData: string; // base64 data URL
  uploadedAt: string;
}

export interface QuestionPaperItem {
  id: string;
  qpCode: string;
  subjectCode: string;
  subjectTitle: string;
  department: string;
  deptKey: string;
  facultyName: string; // Stage 1: Faculty Author
  hodName: string; // Stage 2: HOD DAC Scrutiny
  adName: string; // Stage 3: Associate Dean Academic Scrutiny
  coeName: string; // Stage 4: COE Examination Wing
  chiefCoeName: string; // Stage 5: Chief COE / Super Admin
  currentStageNumber: HierarchyStageNumber; // 1 to 5
  currentStageRole: HierarchyRole;
  status:
    | "PENDING_HOD_REVIEW"
    | "PENDING_AD_REVIEW"
    | "PENDING_COE_REVIEW"
    | "PENDING_CHIEF_COE"
    | "CHIEF_COE_APPROVED"
    | "RETURNED_TO_FACULTY"
    | "RETURNED_TO_HOD"
    | "RETURNED_TO_AD"
    | "RETURNED_TO_COE";
  semester: string;
  academicYear: string;
  regulation: string;
  examType: "End Semester Examination" | "Internal Assessment - I" | "Internal Assessment - II" | "Model Examination";
  set: "Set A" | "Set B";
  dateSubmitted: string;
  timeSubmitted: string;
  forwardedToCoe: boolean;
  forwardedDate?: string;
  approvedBy?: string;
  adRemarks?: string;
  maxMarks: number;
  durationHours: number;
  syllabusCoverage: string;
  bloomsDistribution: {
    rememberUnderstand: number; // K1-K2 (%)
    applyAnalyze: number; // K3-K4 (%)
    evaluateCreate: number; // K5-K6 (%)
  };
  courseOutcomesCovered: string[];
  parts: {
    partA: {
      instructions: string;
      questions: QuestionPartAItem[];
    };
    partB: {
      instructions: string;
      questions: QuestionPartBItem[];
    };
    partC: {
      instructions: string;
      questions: QuestionPartCItem[];
    };
  };
  hodDeclaration: {
    certifiedByHod: boolean;
    moderationDoneByDept: boolean;
    date: string;
    hodNote: string;
  };
  coeReferenceNo?: string;
  chiefCoeSealNo?: string;
  hierarchyTrail: StageSignature[];
  pdfAttachment?: PdfAttachment;
}

export const STORAGE_KEY = "kvell_assoc_dean_question_papers";

export const SAMPLE_QP_PDF_DATA =
  "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNCAwIFIKPj4KPj4KL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAovRjEgMTggVGYKNTAgNzAwIFRkCihLVkVMTCBVTklWRVJTSVRZIC0gUVVFU1RJT04gUEFQRVIgRE9DVU1FTlQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjI4IDAwMDAwIG4gCjAwMDAwMDAyOTYgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozODkKJSVFT0Y=";

export const INITIAL_QUESTION_PAPERS: QuestionPaperItem[] = [
  {
    id: "QP-2026-CSE-CS601",
    qpCode: "KVELL/ESE/2026/CS601-A",
    subjectCode: "CS601",
    subjectTitle: "Deep Learning & Neural Networks",
    department: "Computer Science and Engineering",
    deptKey: "cse",
    facultyName: "Dr. Rajesh Sharma (Assistant Professor - CSE)",
    hodName: "Prof. Jayapradha (HOD - CSE)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 4,
    currentStageRole: "COE",
    status: "PENDING_COE_REVIEW",
    forwardedToCoe: true,
    forwardedDate: "May 12, 2026, 11:45 AM",
    approvedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    semester: "Semester VI",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set A",
    dateSubmitted: "May 10, 2026",
    timeSubmitted: "10:30 AM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "100% (Units I to V)",
    bloomsDistribution: {
      rememberUnderstand: 28,
      applyAnalyze: 52,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks:
      "Academic scrutiny completed. Bloom's taxonomy balance verified (K1-K6). Forwarded to COE Examination Wing for Set Allocation and packaging.",
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "Define the vanishing gradient problem in deep feedforward networks.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 2, text: "Compare ReLU, Leaky ReLU, and GELU activation functions mathematically.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 3, text: "Compute the output dimension of a 224×224 image passed through 64 filters of 7×7 with stride 2 and padding 3.", co: "CO2", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 4, text: "State why 1×1 convolutions (pointwise convolutions) reduce computational complexity in GoogLeNet.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 5, text: "Explain how LSTM gates (Forget, Input, Output) mitigate exponential gradient decay.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 6, text: "Differentiate between teacher forcing and scheduled sampling in sequence models.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 7, text: "Explain scaled dot-product attention formula and why scaling by sqrt(d_k) is required.", co: "CO4", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 8, text: "Identify the trade-off in multi-head attention compared to single wide attention.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 9, text: "State the mathematical objective (minimax formulation) of Generative Adversarial Networks (GANs).", co: "CO5", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 10, text: "Why is mode collapse a failure mode in standard Wasserstein GANs?", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Derive the backpropagation gradient equations for a 3-layer neural network with cross-entropy loss and softmax activation. Provide full mathematical derivation with Jacobian tensors.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain regularization mechanisms: L1/L2 weight decay, Dropout (inverted vs standard), Batch Normalization, and Layer Normalization. Contrast internal covariate shift with gradient smoothness benefits.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Deconstruct the ResNet-50 and DenseNet architectures. Explain degradation problem in deep networks and derive how skip-connections ensure identity mapping gradients.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Analyze modern object detection backbones: Faster R-CNN (RPN, RoI Align) versus Single Shot MultiBox Detector (SSD/YOLOv8). Formulate the Focal Loss for class imbalance.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Design a bidirectional Gated Recurrent Unit (GRU) encoder-decoder network with Bahdanau additive attention for neural machine translation. Detail forward equations and alignment score matrix.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Examine CTC (Connectionist Temporal Classification) loss for speech recognition and sequence alignment. Derive conditional independence assumptions and dynamic programming forward-backward lattice.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Formulate the complete Transformer Encoder-Decoder architecture (Vaswani et al.). Diagram positional encodings (sinusoidal vs learned rotary RoPE), causal masking, and cross-attention blocks.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Compare autoregressive Large Language Models (GPT series) with masked language models (BERT) and sequence-to-sequence models (T5). Analyze pre-training objectives and fine-tuning paradigms (LoRA, QLoRA).",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Deconstruct Denoising Diffusion Probabilistic Models (DDPM). Formulate the forward noising process q(x_t|x_0) and reverse sampling p_theta(x_{t-1}|x_t) with reparameterization trick.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Formulate Deep Q-Networks (DQN) with experience replay buffer and target Q-network stabilization. Explain Double DQN and Dueling DQN architectural enhancements.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
        ],
      },
      partC: {
        instructions: "Answer the Comprehensive / Evaluative Question. (1 × 15 = 15 Marks)",
        questions: [
          {
            qNo: 16,
            text: "You are tasked by KVELL University to deploy a real-time multimodal autonomous diagnosis assistant combining chest CT scan imaging with clinical narrative patient notes. (a) Design an end-to-end foundation model architecture fusing ViT image embeddings with Clinical-LLM text tokens. (b) Formulate the training objective, contrastive loss (CLIP style), and alignment regularization. (c) Devise an adversarial robustness testing protocol against diagnostic hallucinations with clinical safety metrics.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "System architecture diagram & token fusion (5 marks), loss formulation & mathematical rigor (5 marks), hallucination prevention & clinical safety audit (5 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: "May 11, 2026",
      hodNote: "Departmental Academic Committee conducted review. All course outcomes mapped to syllabus. Forwarded to Associate Dean for institutional scrutiny.",
    },
    coeReferenceNo: "COE/DISPATCH/2026/7821",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. Rajesh Sharma (Assistant Professor - CSE)",
        status: "COMPLETED",
        timestamp: "May 10, 2026, 10:30 AM",
        sealOrReference: "FAC-CSE-CS601-DRAFT",
        remarks: "Authored in accordance with Autonomous Regulation 2021 guidelines. 100% syllabus covered.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Prof. Jayapradha (HOD - CSE)",
        status: "COMPLETED",
        timestamp: "May 11, 2026, 02:15 PM",
        sealOrReference: "DAC-CSE-MOD-2026-081",
        remarks: "DAC Scrutiny checklist passed. Bloom's distribution verified: K1-K2 (28%), K3-K4 (52%), K5-K6 (20%). Forwarded to Associate Dean.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "COMPLETED",
        timestamp: "May 12, 2026, 11:45 AM",
        sealOrReference: "AD/ACAD/MOD-2026/894",
        remarks: "Verified Bloom's taxonomy distribution, Course Outcome mapping, and Part B difficulty balance. Approved for COE examination wing.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "CURRENT",
        timestamp: "Received from AD May 12, 2026",
        remarks: "Under COE confidential room review and room allocation.",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish (Chief COE & Super Administrator)",
        status: "PENDING",
      },
    ],
  },
  {
    id: "QP-2026-AIDS-AI602",
    qpCode: "KVELL/ESE/2026/AI602-A",
    subjectCode: "AI602",
    subjectTitle: "Natural Language Processing & LLMs",
    department: "Artificial Intelligence and Data Science",
    deptKey: "aids",
    facultyName: "Dr. Priya Sundaram (Associate Professor - AI&DS)",
    hodName: "Dr. S. K. Narayanan (HOD - AI&DS)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 5,
    currentStageRole: "Chief COE",
    status: "PENDING_CHIEF_COE",
    forwardedToCoe: true,
    forwardedDate: "May 11, 2026, 04:30 PM",
    approvedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    semester: "Semester VI",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set A",
    dateSubmitted: "May 09, 2026",
    timeSubmitted: "11:00 AM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "100% (Units I to V)",
    bloomsDistribution: {
      rememberUnderstand: 25,
      applyAnalyze: 55,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks:
      "All units covered uniformly. Recommended to COE with recommendation for Set A primary release.",
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "Explain subword tokenization: Byte-Pair Encoding (BPE) versus WordPiece.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 2, text: "Define perplexity in autoregressive language models.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 3, text: "Differentiate word2vec CBOW and Skip-gram architectures.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 4, text: "State the mathematical formulation of Glove word embeddings.", co: "CO2", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 5, text: "Explain self-attention computational complexity with sequence length n.", co: "CO3", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 6, text: "What is FlashAttention and how does it optimize SRAM/HBM memory transfers?", co: "CO3", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 7, text: "Explain RLHF (Reinforcement Learning from Human Feedback) with PPO.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 8, text: "Define Direct Preference Optimization (DPO) and contrast with RLHF.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 9, text: "Explain Retrieval Augmented Generation (RAG) vector embeddings cosine similarity.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 10, text: "State how G-Eval utilizes GPT-4 as an evaluative judge for NLP tasks.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Analyze statistical language modeling versus neural sequence models. Derive n-gram smoothing (Kneser-Ney) equations and contrast with Recurrent Neural Network language modeling.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Examine named entity recognition and POS tagging using BiLSTM-CRF. Formulate emission scores, transition matrix, and Viterbi decoding algorithm.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Deconstruct contextual representation models: BERT (Masked LM, Next Sentence Prediction) versus RoBERTa and DeBERTa (disentangled attention).",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Analyze autoregressive decoding strategies: Greedy search, Beam search, Top-k sampling, Top-p (nucleus) sampling, and temperature scaling.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Detail parameter-efficient fine-tuning (PEFT): Low-Rank Adaptation (LoRA), Prefix Tuning, and Prompt Tuning. Derive parameter reduction ratios.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Formulate Mixture of Experts (MoE) in transformer architectures. Explain routing gating network, load balancing loss, and expert capacity factors.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Examine alignment and red-teaming in LLMs. Contrast Constitutional AI, safety guardrails, and jailbreak attack mitigation strategies.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Analyze instruction tuning methodologies (Alpaca, FLAN, LIMA). Explain data quality curation vs data quantity in instruction following performance.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Design an enterprise Agentic RAG system with query rewriting, hybrid sparse-dense retrieval (BM25 + ColBERT), reranking (cross-encoder), and self-reflective reasoning.",
              co: "CO5",
              bloom: "K5 (Evaluate)",
              marks: 13,
            },
            optionB: {
              text: "Formulate automated evaluation metrics for LLM generation: ROUGE, BLEU, BERTScore, and LLM-as-a-Judge pairwise evaluation methodologies.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
        ],
      },
      partC: {
        instructions: "Answer the Comprehensive / Evaluative Question. (1 × 15 = 15 Marks)",
        questions: [
          {
            qNo: 16,
            text: "Develop an architecture for an Autonomous Legal AI Assistant capable of parsing 500-page court proceedings, identifying statutory precedents, and drafting appellate briefs. (a) Design the long-context retrieval framework (e.g. Needle-in-a-Haystack benchmarked architecture). (b) Formulate the hallucination detection mechanism with citation attribution grounding. (c) Devise an evaluation rubric for legal accuracy, jurisdictional correctness, and confidentiality compliance.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "Long context system architecture (5 marks), citation grounding & hallucination mitigation (5 marks), evaluation rubric & legal safety governance (5 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: "May 10, 2026",
      hodNote: "Endorsed by AI&DS Department DAC. Verified high-order Bloom's taxonomy in Part B and Part C.",
    },
    coeReferenceNo: "COE/DISPATCH/2026/8942",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. Priya Sundaram",
        status: "COMPLETED",
        timestamp: "May 09, 2026, 11:00 AM",
        sealOrReference: "FAC-AIDS-AI602-DRAFT",
        remarks: "100% curriculum compliance, complete CO-PO matrix mapping.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Dr. S. K. Narayanan",
        status: "COMPLETED",
        timestamp: "May 10, 2026, 03:00 PM",
        sealOrReference: "DAC-AIDS-MOD-2026-042",
        remarks: "Syllabus audited. Part C rubrics aligned with Autonomous Regulation 2021.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "COMPLETED",
        timestamp: "May 11, 2026, 04:30 PM",
        sealOrReference: "AD/ACAD/MOD-2026/902",
        remarks: "Academic scrutiny verified. Bloom's taxonomy balanced. Approved for COE examination conduction.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "COMPLETED",
        timestamp: "May 12, 2026, 03:15 PM",
        sealOrReference: "COE/DISPATCH/2026/8942",
        remarks: "Confidential set allocation confirmed (Set A primary). Endorsed and forwarded to Chief COE Dr. Sathish for Master Seal.",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish (Chief COE & Super Administrator)",
        status: "CURRENT",
        timestamp: "Awaiting Chief COE Master Seal",
        remarks: "Pending final executive authorization by Chief COE.",
      },
    ],
  },
  {
    id: "QP-2026-BME-BM603",
    qpCode: "KVELL/ESE/2026/BM603-A",
    subjectCode: "BM603",
    subjectTitle: "Biomedical Signal Processing & Neural Telemetry",
    department: "Biomedical Engineering",
    deptKey: "bme",
    facultyName: "Dr. K. Swaminathan (Assistant Professor - BME)",
    hodName: "Dr. R. Kavitha (HOD - BME)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 5,
    currentStageRole: "Chief COE",
    status: "CHIEF_COE_APPROVED",
    forwardedToCoe: true,
    forwardedDate: "May 08, 2026, 02:00 PM",
    approvedBy: "Dr. Sathish (Chief COE & Super Administrator)",
    semester: "Semester VI",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set A",
    dateSubmitted: "May 06, 2026",
    timeSubmitted: "09:30 AM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "100% (Units I to V)",
    bloomsDistribution: {
      rememberUnderstand: 30,
      applyAnalyze: 50,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks:
      "Academic Scrutiny approved. Full 5-stage permission cycle completed and signed off by Chief COE.",
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "Explain the physiological origin of EEG alpha, beta, theta, and delta rhythms.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 2, text: "State the sampling theorem criteria for ECG signals with pacemaker spikes.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 3, text: "Design a digital notch filter to eliminate 50 Hz powerline interference in ECG.", co: "CO2", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 4, text: "Explain baseline wander removal using cubic spline interpolation.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 5, text: "Formulate the Pan-Tompkins QRS detection algorithm.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 6, text: "Differentiate between continuous wavelet transform (CWT) and discrete wavelet transform (DWT).", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 7, text: "State the mathematical model of an Action Potential in Hodgkin-Huxley equations.", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 8, text: "Define Heart Rate Variability (HRV) time-domain metrics: SDNN and RMSSD.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 9, text: "Explain Common Spatial Pattern (CSP) filtering for Brain-Computer Interfaces (BCI).", co: "CO5", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 10, text: "State the safety limits for electrical current leakage in IEC 60601-1 standard.", co: "CO5", bloom: "K1 (Remember)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Formulate adaptive filtering for maternal-fetal ECG extraction. Derive the Least Mean Squares (LMS) and Normalized LMS weight update equations with stability bounds.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Analyze Independent Component Analysis (ICA) for ocular artifact removal in multi-channel EEG. Contrast Infomax and FastICA algorithms.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Examine time-frequency distributions for non-stationary biosignals: Short-Time Fourier Transform (STFT) vs Wigner-Ville Distribution (WVD). Detail cross-term interference.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Detail multiresolution wavelet decomposition of EMG signals for neuromuscular fatigue evaluation. Formulate median frequency shifts.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Design a real-time cardiac arrhythmia classification system using 1D Convolutional Neural Networks and BiLSTM networks for MIT-BIH Arrhythmia database.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Formulate spectral estimation techniques for Heart Rate Variability: Parametric Autoregressive (Yule-Walker) versus Non-parametric Welch periodogram.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Deconstruct wireless implantable neural telemetry systems. Analyze inductive power transfer, backscatter modulation, and ultra-low-power SAR ADC architectures.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Examine intracranial pressure (ICP) monitoring biosensors. Detail piezoresistive vs optical fiber sensors with biocompatibility encapsulation packaging.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Formulate a closed-loop Deep Brain Stimulation (DBS) algorithm for Parkinsonian tremor suppression. Diagram feedback loop and biomarker phase-amplitude coupling.",
              co: "CO5",
              bloom: "K5 (Evaluate)",
              marks: 13,
            },
            optionB: {
              text: "Detail motor imagery Brain-Computer Interface (BCI) decoding pipeline: Filter Bank Common Spatial Pattern (FBCSP) + Riemannian Geometry classifiers.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
        ],
      },
      partC: {
        instructions: "Answer the Comprehensive / Evaluative Question. (1 × 15 = 15 Marks)",
        questions: [
          {
            qNo: 16,
            text: "Design an edge-computing wearable ICU patient telemetry device for early sepsis onset detection from continuous PPG, ECG, and impedance pneumography. (a) Specify the analog front-end (AFE) architecture and motion artifact rejection pipeline. (b) Formulate the early warning risk score model using conformal prediction with bounded false alarm rates. (c) Devise an ISO 14971 medical risk management and clinical validation protocol.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "AFE & hardware architecture (5 marks), prediction model & algorithmic rigor (5 marks), regulatory compliance & validation protocol (5 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: "May 07, 2026",
      hodNote: "Complete DAC scrutiny completed. All biomedical standards and CO mapping verified.",
    },
    coeReferenceNo: "COE/DISPATCH/2026/6510",
    chiefCoeSealNo: "KVELL/SEAL/2026/4102",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. K. Swaminathan",
        status: "COMPLETED",
        timestamp: "May 06, 2026, 09:30 AM",
        sealOrReference: "FAC-BME-BM603-DRAFT",
        remarks: "100% syllabus verified, Part C designed for clinical evaluative rubrics.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Dr. R. Kavitha",
        status: "COMPLETED",
        timestamp: "May 07, 2026, 01:15 PM",
        sealOrReference: "DAC-BME-MOD-2026-019",
        remarks: "DAC compliance certified. Course outcomes and Bloom's balance validated.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "COMPLETED",
        timestamp: "May 08, 2026, 02:00 PM",
        sealOrReference: "AD/ACAD/MOD-2026/721",
        remarks: "Institutional scrutiny approved. Forwarded to COE Examination Wing.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "COMPLETED",
        timestamp: "May 09, 2026, 11:30 AM",
        sealOrReference: "COE/DISPATCH/2026/6510",
        remarks: "Confidential set allocation confirmed. Recommended to Chief COE.",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish (Chief COE & Super Administrator)",
        status: "COMPLETED",
        timestamp: "May 10, 2026, 10:00 AM",
        sealOrReference: "KVELL/SEAL/2026/4102",
        remarks: "EXECUTIVE SEAL APPLIED: Master University Seal issued by Chief COE Dr. Sathish. Question Paper officially released for examination conduction.",
      },
    ],
  },
];

export function sanitizeQuestionPaper(p: any): QuestionPaperItem {
  const fallback = INITIAL_QUESTION_PAPERS[0];
  if (!p || typeof p !== "object") return fallback;

  const id = p.id || `QP-${Date.now()}`;
  const subjectCode = p.subjectCode || "CS601";
  const subjectTitle = p.subjectTitle || "Course Subject";
  const department = p.department || "Computer Science and Engineering";
  const deptKey = p.deptKey || "cse";
  const facultyName = p.facultyName || "Dr. Rajesh Sharma (Assistant Professor - CSE)";
  const hodName = p.hodName || "Prof. Jayapradha (HOD - CSE)";
  const adName = p.adName || "Dr. K. R. Ramanathan (Associate Dean - Academics)";
  const coeName = p.coeName || "Dr. N. Balasubramanian (Controller of Examinations)";
  const chiefCoeName = p.chiefCoeName || "Dr. Sathish (Chief COE & Super Administrator)";

  let currentStageNumber: HierarchyStageNumber = 4;
  if (typeof p.currentStageNumber === "number" && p.currentStageNumber >= 1 && p.currentStageNumber <= 5) {
    currentStageNumber = p.currentStageNumber as HierarchyStageNumber;
  } else if (p.status === "PENDING_HOD_REVIEW") {
    currentStageNumber = 2;
  } else if (p.status === "PENDING_AD_REVIEW") {
    currentStageNumber = 3;
  } else if (p.status === "PENDING_COE_REVIEW") {
    currentStageNumber = 4;
  } else if (p.status === "CHIEF_COE_APPROVED" || p.status === "PENDING_CHIEF_COE") {
    currentStageNumber = 5;
  }

  const currentStageRole: HierarchyRole =
    p.currentStageRole ||
    (currentStageNumber === 1
      ? "Faculty"
      : currentStageNumber === 2
      ? "HOD"
      : currentStageNumber === 3
      ? "AD"
      : currentStageNumber === 4
      ? "COE"
      : "Chief COE");

  const status = p.status || "PENDING_COE_REVIEW";

  const bloomsDistribution = {
    rememberUnderstand:
      typeof p.bloomsDistribution?.rememberUnderstand === "number"
        ? p.bloomsDistribution.rememberUnderstand
        : 30,
    applyAnalyze:
      typeof p.bloomsDistribution?.applyAnalyze === "number"
        ? p.bloomsDistribution.applyAnalyze
        : 50,
    evaluateCreate:
      typeof p.bloomsDistribution?.evaluateCreate === "number"
        ? p.bloomsDistribution.evaluateCreate
        : 20,
  };

  const defaultTrail: StageSignature[] = [
    {
      stageNumber: 1,
      stageRole: "Faculty",
      officerTitle: "Subject Instructor",
      officerName: facultyName,
      status: "COMPLETED",
      timestamp: p.dateSubmitted || "May 10, 2026, 10:30 AM",
      sealOrReference: `FAC-SUB-${deptKey.toUpperCase()}-2026`,
      remarks: "Drafted strictly in accordance with Autonomous Regulation 2021 curriculum.",
    },
    {
      stageNumber: 2,
      stageRole: "HOD",
      officerTitle: "Head of Department",
      officerName: hodName,
      status: currentStageNumber >= 3 ? "COMPLETED" : currentStageNumber === 2 ? "CURRENT" : "PENDING",
      timestamp: currentStageNumber >= 3 ? "May 11, 2026, 02:15 PM" : undefined,
      sealOrReference: currentStageNumber >= 3 ? `DAC-CSE-MOD-2026` : undefined,
      remarks: "Verified syllabus coverage 100%, Bloom's balance, and DAC checklist. Forwarded to Associate Dean.",
    },
    {
      stageNumber: 3,
      stageRole: "AD",
      officerTitle: "Associate Dean (Academics)",
      officerName: adName,
      status: currentStageNumber >= 4 ? "COMPLETED" : currentStageNumber === 3 ? "CURRENT" : "PENDING",
      timestamp: currentStageNumber >= 4 ? p.forwardedDate || "May 12, 2026, 11:45 AM" : undefined,
      sealOrReference: currentStageNumber >= 4 ? `AD-ACAD-APPROVAL-2026` : undefined,
      remarks: p.adRemarks || (currentStageNumber >= 4 ? "Academic review completed and endorsed for COE." : undefined),
    },
    {
      stageNumber: 4,
      stageRole: "COE",
      officerTitle: "Controller of Examinations",
      officerName: coeName,
      status: currentStageNumber >= 5 ? "COMPLETED" : currentStageNumber === 4 ? "CURRENT" : "PENDING",
      timestamp: currentStageNumber >= 5 ? "May 13, 2026, 04:00 PM" : undefined,
      sealOrReference: p.coeReferenceNo,
      remarks: currentStageNumber >= 5 ? "Confidential allocation and packaging complete." : undefined,
    },
    {
      stageNumber: 5,
      stageRole: "Chief COE",
      officerTitle: "Chief University Controller",
      officerName: chiefCoeName,
      status: status === "CHIEF_COE_APPROVED" ? "COMPLETED" : currentStageNumber === 5 ? "CURRENT" : "PENDING",
      timestamp: status === "CHIEF_COE_APPROVED" ? "May 14, 2026, 09:30 AM" : undefined,
      sealOrReference: p.chiefCoeSealNo,
      remarks: status === "CHIEF_COE_APPROVED" ? "Master university examination seal issued." : undefined,
    },
  ];

  const hierarchyTrail =
    Array.isArray(p.hierarchyTrail) && p.hierarchyTrail.length > 0
      ? p.hierarchyTrail
      : defaultTrail;

  const parts = {
    partA: {
      instructions: p.parts?.partA?.instructions || fallback.parts.partA.instructions,
      questions:
        Array.isArray(p.parts?.partA?.questions) && p.parts.partA.questions.length > 0
          ? p.parts.partA.questions
          : fallback.parts.partA.questions,
    },
    partB: {
      instructions: p.parts?.partB?.instructions || fallback.parts.partB.instructions,
      questions:
        Array.isArray(p.parts?.partB?.questions) && p.parts.partB.questions.length > 0
          ? p.parts.partB.questions
          : fallback.parts.partB.questions,
    },
    partC: {
      instructions: p.parts?.partC?.instructions || fallback.parts.partC.instructions,
      questions:
        Array.isArray(p.parts?.partC?.questions) && p.parts.partC.questions.length > 0
          ? p.parts.partC.questions
          : fallback.parts.partC.questions,
    },
  };

  return {
    ...p,
    id,
    qpCode: p.qpCode || `KVELL/ESE/2026/${subjectCode}-A`,
    subjectCode,
    subjectTitle,
    department,
    deptKey,
    facultyName,
    hodName,
    adName,
    coeName,
    chiefCoeName,
    currentStageNumber,
    currentStageRole,
    status,
    semester: p.semester || "Semester VI",
    academicYear: p.academicYear || "2025 - 2026",
    regulation: p.regulation || "Regulation 2021 (Autonomous)",
    examType: p.examType || "End Semester Examination",
    set: p.set || "Set A",
    dateSubmitted: p.dateSubmitted || "May 10, 2026",
    timeSubmitted: p.timeSubmitted || "10:30 AM",
    forwardedToCoe: !!p.forwardedToCoe,
    forwardedDate: p.forwardedDate,
    approvedBy: p.approvedBy,
    adRemarks: p.adRemarks || "",
    maxMarks: p.maxMarks || 100,
    durationHours: p.durationHours || 3,
    syllabusCoverage: p.syllabusCoverage || "100% (Units I to V)",
    bloomsDistribution,
    courseOutcomesCovered:
      Array.isArray(p.courseOutcomesCovered) && p.courseOutcomesCovered.length > 0
        ? p.courseOutcomesCovered
        : ["CO1", "CO2", "CO3", "CO4", "CO5"],
    parts,
    hodDeclaration: p.hodDeclaration || {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: p.dateSubmitted || "May 10, 2026",
      hodNote: "Verified syllabus coverage and DAC checklist.",
    },
    coeReferenceNo: p.coeReferenceNo,
    chiefCoeSealNo: p.chiefCoeSealNo,
    hierarchyTrail,
    pdfAttachment: p.pdfAttachment
      ? {
          fileName: p.pdfAttachment.fileName || "question-paper.pdf",
          fileSize: p.pdfAttachment.fileSize || "245 KB",
          fileData: p.pdfAttachment.fileData || SAMPLE_QP_PDF_DATA,
          uploadedAt: p.pdfAttachment.uploadedAt || p.dateSubmitted || "May 10, 2026",
        }
      : {
          fileName: `${subjectCode}_Autonomous_QP_2026.pdf`,
          fileSize: "245 KB",
          fileData: SAMPLE_QP_PDF_DATA,
          uploadedAt: p.dateSubmitted || "May 10, 2026",
        },
  };
}

/** The question papers the signed-in COE / Chief COE may see (from the server; see services/questionPapersApi). */
export function safeLoadQuestionPapers(): QuestionPaperItem[] {
  return cachedQuestionPapers();
}
