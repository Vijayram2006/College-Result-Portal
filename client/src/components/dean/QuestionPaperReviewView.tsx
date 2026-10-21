import React, { useState, useMemo, useEffect } from "react";
import {
  apiErrorMessage,
  cachedQuestionPapers,
  questionPaperAction,
  refreshQuestionPapers,
  resolvePdfUrl,
  usePdfUrl,
  useQuestionPapers,
  type PaperAction,
} from "../../services/questionPapersApi";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Send,
  RotateCcw,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  Eye,
  AlertCircle,
  Building2,
  BookOpen,
  Award,
  CheckSquare,
  Sparkles,
  User,
  Calendar,
  FileCheck,
  ArrowRight,
  X,
  ExternalLink,
  Layers,
  HelpCircle,
  Check,
  Lock,
  Crown,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

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
    currentStageNumber: 3,
    currentStageRole: "AD",
    status: "PENDING_AD_REVIEW",
    forwardedToCoe: false,
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
      rememberUnderstand: 30,
      applyAnalyze: 50,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks: "",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. Rajesh Sharma",
        status: "COMPLETED",
        timestamp: "May 09, 2026, 04:30 PM",
        sealOrReference: "FAC-SUB-CSE-091",
        remarks: "Question paper drafted with Part A, B, and C strictly mapped to Course Outcomes CO1-CO5.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Prof. Jayapradha",
        status: "COMPLETED",
        timestamp: "May 10, 2026, 10:30 AM",
        sealOrReference: "HOD/CSE/DAC-2026/044",
        remarks: "DAC Scrutiny completed. Syllabus coverage verified (100%). Endorsed and forwarded to Associate Dean.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "CURRENT",
        timestamp: "Under Academic Scrutiny",
        remarks: "Awaiting Associate Dean moderation and clearance for COE dispatch.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "PENDING",
        remarks: "Awaiting transmission from Associate Dean.",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish",
        status: "PENDING",
        remarks: "Awaiting final clearance and Master University Seal generation.",
      },
    ],
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "Define the activation function and state why non-linearity is essential in deep networks.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 2, text: "Distinguish between stochastic gradient descent and mini-batch gradient descent.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 3, text: "Explain the vanishing gradient problem and how the ReLU activation function mitigates it.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 4, text: "What is the purpose of L1 and L2 regularization in deep learning? How do their weight penalties differ?", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 5, text: "Calculate the output spatial dimension of a 32x32 feature map after applying a 5x5 convolution with stride 1 and padding 2.", co: "CO3", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 6, text: "State the primary advantage of 1x1 convolutions in the Inception network architecture.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 7, text: "Why do recurrent neural networks (RNNs) struggle with long-term sequential dependencies?", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 8, text: "Enumerate the three gates of an LSTM cell and explain the mathematical role of the Forget Gate.", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 9, text: "What is the minimax game objective formulated between the Generator and Discriminator in a GAN?", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 10, text: "Define Perplexity and BLEU score as standard evaluation metrics for generative language models.", co: "CO5", bloom: "K1 (Remember)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Derive the mathematical backpropagation equations for a 3-layer Multilayer Perceptron utilizing Mean Squared Error loss. Show weight update formulas step-by-step.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
              subdivisions: ["(i) Forward pass matrix equations (4 marks)", "(ii) Error delta backward propagation derivation (6 marks)", "(iii) Momentum-based weight adjustments (3 marks)"],
            },
            optionB: {
              text: "Elucidate the architecture of Adam optimizer. Compare its adaptive learning rate behavior against AdaGrad and RMSProp with convergence graphs.",
              co: "CO1",
              bloom: "K3 (Apply)",
              marks: 13,
              subdivisions: ["(i) First and second moment estimators (5 marks)", "(ii) Bias correction formulation (4 marks)", "(iii) Comparative convergence trajectories (4 marks)"],
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Explain the architecture of ResNet-50. Discuss how residual identity mapping solves the degradation problem in ultra-deep networks.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
              subdivisions: ["(i) Residual block schematic with skip connection (5 marks)", "(ii) Mathematical formulation of F(x) + x (4 marks)", "(iii) Bottleneck layer design for parameter reduction (4 marks)"],
            },
            optionB: {
              text: "Discuss data augmentation and dropout mechanisms in training robust deep convolutional models. Provide visual and mathematical rationale.",
              co: "CO2",
              bloom: "K3 (Apply)",
              marks: 13,
              subdivisions: ["(i) Inverted dropout algorithm during train vs test (7 marks)", "(ii) Spatial transforms and Mixup augmentation (6 marks)"],
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Design a Convolutional Neural Network pipeline for real-time medical radiography classification. Specify layer configurations, receptive fields, and activation choices.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
              subdivisions: ["(i) Network topology diagram (5 marks)", "(ii) Dimension calculations through pooling and flattening (5 marks)", "(iii) Softmax cross-entropy loss formulation (3 marks)"],
            },
            optionB: {
              text: "Explain YOLO (You Only Look Once) architecture for real-time object detection. Detail grid cell bounding box prediction and Non-Maximum Suppression (NMS).",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
              subdivisions: ["(i) Grid prediction tensor structure S x S x (B*5 + C) (6 marks)", "(ii) Intersection over Union (IoU) calculation (3 marks)", "(iii) NMS thresholding algorithm (4 marks)"],
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Construct a complete Bidirectional LSTM network for named entity recognition (NER) in healthcare text. Show mathematical formulation of hidden state updates.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
              subdivisions: ["(i) Forward and backward sequence unrolling (5 marks)", "(ii) Hidden state concatenation and linear projection (4 marks)", "(iii) Handling variable-length sequences with masking (4 marks)"],
            },
            optionB: {
              text: "Explain the Gated Recurrent Unit (GRU) cell architecture. Contrast its computational efficiency and parameter count with standard LSTM.",
              co: "CO4",
              bloom: "K3 (Apply)",
              marks: 13,
              subdivisions: ["(i) Reset gate and Update gate equations (7 marks)", "(ii) Quantitative parameter comparison against LSTM (6 marks)"],
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Deconstruct the Transformer encoder architecture. Derive the Scaled Dot-Product Multi-Head Self-Attention mechanism with mathematical matrix representations.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
              subdivisions: ["(i) Query, Key, Value linear projections (4 marks)", "(ii) Scaled attention Softmax((QK^T)/sqrt(d_k))V (5 marks)", "(iii) Positional encoding rationale (4 marks)"],
            },
            optionB: {
              text: "Describe the training dynamics of Deep Convolutional Generative Adversarial Networks (DCGAN). Outline the guidelines for stable GAN training without mode collapse.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
              subdivisions: ["(i) Architectural constraints of DCGAN (6 marks)", "(ii) Mode collapse diagnosis and Wasserstein GAN mitigation (7 marks)"],
            },
          },
        ],
      },
      partC: {
        instructions: "Answer the Comprehensive / Evaluative Question. (1 × 15 = 15 Marks)",
        questions: [
          {
            qNo: 16,
            text: "You are tasked by KVELL Smart Campus Labs with developing an end-to-end Multimodal Deep Learning surveillance model that simultaneously processes thermal camera streams, acoustic sensors, and optical cameras to detect campus anomalies in real time. (a) Design the unified multi-stream fusion architecture (Early vs Intermediate vs Late fusion). (b) Formulate the multi-task loss function. (c) Devise an edge deployment optimization strategy (quantization and pruning) to achieve 30 FPS inference on edge NPUs.",
            co: "CO5",
            bloom: "K5/K6 (Evaluate & Create)",
            marks: 15,
            rubricHint: "Evaluate architectural fusion feasibility (5 marks), loss formulation correctness (5 marks), and edge optimization strategy (5 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: "May 10, 2026",
      hodNote: "The question paper has been scrutinized by the Departmental Academic Committee (DAC). Course outcome coverage is 100% compliant with Regulation 2021 curriculum.",
    },
  },
  {
    id: "QP-2026-AIDS-AI602",
    qpCode: "KVELL/ESE/2026/AI602-B",
    subjectCode: "AI602",
    subjectTitle: "Deep Learning Architectures",
    department: "Artificial Intelligence & Data Science",
    deptKey: "aids",
    facultyName: "Dr. Priya Sundaram (Associate Professor - AI&DS)",
    hodName: "Dr. R. Saravanan (HOD - AI&DS)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 3,
    currentStageRole: "AD",
    status: "PENDING_AD_REVIEW",
    forwardedToCoe: false,
    semester: "Semester VI",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set B",
    dateSubmitted: "May 11, 2026",
    timeSubmitted: "02:15 PM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "100% (Units I to V)",
    bloomsDistribution: {
      rememberUnderstand: 25,
      applyAnalyze: 55,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks: "",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. Priya Sundaram",
        status: "COMPLETED",
        timestamp: "May 10, 2026, 02:00 PM",
        sealOrReference: "FAC-SUB-AIDS-018",
        remarks: "Set B question paper generated with balanced multi-modal vision transformer questions.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Dr. R. Saravanan",
        status: "COMPLETED",
        timestamp: "May 11, 2026, 02:15 PM",
        sealOrReference: "HOD/AIDS/DAC-2026/058",
        remarks: "DAC Scrutiny passed. Industry 4.0 alignment certified. Submitted to Associate Dean.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "CURRENT",
        timestamp: "Under Academic Scrutiny",
        remarks: "Reviewing Bloom's levels and Part B options.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "PENDING",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish",
        status: "PENDING",
      },
    ],
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "What is the role of Layer Normalization in transformer models compared to Batch Normalization?", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 2, text: "Define Cosine Similarity in latent embedding spaces.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 3, text: "Explain how Vision Transformers (ViT) tokenize 2D images into 1D patch embeddings.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 4, text: "What is the significance of the CLS token in BERT encoder architecture?", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 5, text: "State the objective of Contrastive Language-Image Pretraining (CLIP).", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 6, text: "How does Swin Transformer reduce computational complexity from quadratic to linear?", co: "CO3", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 7, text: "Distinguish between Autoregressive (GPT) and Autoencoding (BERT) language models.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 8, text: "What is Denoising Diffusion Probabilistic Model (DDPM) reverse process?", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 9, text: "Define Reinforcement Learning from Human Feedback (RLHF) reward model optimization.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 10, text: "What is LoRA (Low-Rank Adaptation) and how does it reduce trainable parameters?", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Formulate the Vision Transformer (ViT) architecture from raw patch projection to classification head. Detail positional embeddings and multi-head attention blocks.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Compare ConvNeXt with Swin Transformer. Assess how modernized ConvNets recover performance parity with Vision Transformers.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Elaborate on BERT pretraining objectives: Masked Language Modeling (MLM) and Next Sentence Prediction (NSP). Detail the loss formulations.",
              co: "CO2",
              bloom: "K3 (Apply)",
              marks: 13,
            },
            optionB: {
              text: "Explain the architecture of GPT-3 decoder-only architecture. Discuss how In-Context Learning and Few-Shot Prompting function without weight updating.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Analyze Diffusion Models for generative synthesis. Formulate forward Gaussian noise injection and reverse denoising with U-Net architecture.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain Latent Diffusion Models (Stable Diffusion). Discuss how cross-attention integrates text conditioning embeddings from frozen CLIP encoders.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Formulate the Direct Preference Optimization (DPO) framework. Compare its mathematical stability and convergence against PPO-based RLHF.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Detail Parameter-Efficient Fine-Tuning (PEFT) methodologies. Compare LoRA, QLoRA (4-bit normal float), Prefix Tuning, and Adapter Modules.",
              co: "CO4",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Explain Multimodal Foundation Models (e.g., LLaVA, GPT-4V). Diagram the vision-language alignment projection and conversational fine-tuning.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Examine retrieval-augmented generation (RAG) architecture for enterprise LLMs. Analyze chunking strategies, vector embeddings, and re-ranking algorithms.",
              co: "CO5",
              bloom: "K3 (Apply)",
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
            text: "Design an AI Diagnostic Foundation Model for KVELL Medical Research Institute capable of processing 3D MRI volumes, pathological slide images, and electronic health records (EHR). Formulate: (1) The multimodal encoder fusion mechanism. (2) Uncertainty estimation and hallucination prevention rubrics for clinical safety. (3) Continuous learning architecture that avoids catastrophic forgetting when new pathology classes are introduced.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "Comprehensive architecture design (6 marks), clinical safety/hallucination checks (5 marks), continual learning mechanism (4 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: "May 11, 2026",
      hodNote: "Paper adheres strictly to autonomous board rubrics. Part C presents novel diagnostic scenario reflecting AICTE Industry 4.0 guidelines.",
    },
  },
  {
    id: "QP-2026-BME-BM401",
    qpCode: "KVELL/ESE/2026/BM401-A",
    subjectCode: "BM401",
    subjectTitle: "Biomedical Sensors & Telemetry",
    department: "Biomedical Engineering",
    deptKey: "bme",
    facultyName: "Dr. K. Swaminathan (Assistant Professor - BME)",
    hodName: "Dr. S. Radhika (HOD - BME)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 5,
    currentStageRole: "Chief COE",
    status: "CHIEF_COE_APPROVED",
    forwardedToCoe: true,
    forwardedDate: "May 12, 2026, 04:30 PM",
    approvedBy: "Dr. Sathish (Overall University COE & Super Administrator)",
    coeReferenceNo: "COE/DISPATCH/2026/0488",
    chiefCoeSealNo: "KVELL/CHIEF-COE/FINAL/2026/0019",
    semester: "Semester IV",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set A",
    dateSubmitted: "May 08, 2026",
    timeSubmitted: "09:45 AM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "100% (Units I to V)",
    bloomsDistribution: {
      rememberUnderstand: 35,
      applyAnalyze: 45,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks: "Academic Scrutiny approved. Full 5-stage permission cycle completed and signed off by Chief COE.",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. K. Swaminathan",
        status: "COMPLETED",
        timestamp: "May 07, 2026, 05:00 PM",
        sealOrReference: "FAC-BME-041",
        remarks: "Questions prepared per medical instrumentation syllabus.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Dr. S. Radhika",
        status: "COMPLETED",
        timestamp: "May 08, 2026, 09:45 AM",
        sealOrReference: "HOD/BME/DAC-2026/022",
        remarks: "DAC reviewed. Clinical safety questions certified.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "COMPLETED",
        timestamp: "May 10, 2026, 11:30 AM",
        sealOrReference: "AD/ACAD/MOD-2026/089",
        remarks: "Bloom's taxonomy balance verified. Approved for COE examination conduction.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "COMPLETED",
        timestamp: "May 11, 2026, 03:00 PM",
        sealOrReference: "COE/DISPATCH/2026/0488",
        remarks: "Confidential set allocation confirmed. Recommended to Chief COE.",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish",
        status: "COMPLETED",
        timestamp: "May 12, 2026, 04:30 PM",
        sealOrReference: "KVELL/CHIEF-COE/FINAL/2026/0019",
        remarks: "Final Executive Authorization granted. Master University Seal applied. Locked for confidential printing.",
      },
    ],
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "State the Goldman-Hodgkin-Katz equation for bio-electric membrane potential.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 2, text: "Distinguish between polarizable and non-polarizable bio-electrodes.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 3, text: "Explain the half-cell potential in Ag/AgCl reference electrodes.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 4, text: "What is motion artifact in ECG telemetry and how is skin abrasion helpful?", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 5, text: "Define gauge factor in semiconductor piezoelectric strain sensors.", co: "CO3", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 6, text: "Explain the working principle of a Clarke oxygen electrode for arterial blood gas.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 7, text: "State the frequency bands allocated by ITU for Medical Implant Communication Service (MICS).", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 8, text: "What is frequency division multiplexing (FDM) in multichannel patient telemetry?", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 9, text: "Explain the safety isolation standards specified in IEC 60601-1 for patient-contact sensors.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 10, text: "Define specific absorption rate (SAR) in wearable RF telemetry transmitters.", co: "CO5", bloom: "K1 (Remember)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Explain the design and operation of 3-op-amp Instrumentation Amplifier for low-level ECG acquisition. Derive its Common Mode Rejection Ratio (CMRR).",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Discuss the electrical characteristics of intracellular microelectrodes. Detail equivalent RC models and neutralization of stray capacitance.",
              co: "CO1",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Detail the construction and operational dynamics of optical pulse oximetry sensors (SpO2). Formulate the photoplethysmography (PPG) ratio-of-ratios algorithm.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain ultrasound transducer arrays for Doppler blood flow velocity measurement. Contrast continuous wave (CW) with pulsed wave (PW) Doppler.",
              co: "CO2",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Examine enzyme-based amperometric glucose biosensors. Diagram the glucose oxidase reaction and mediators used to overcome dissolved oxygen dependence.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Detail fiber optic sensors for intravascular pressure and temperature measurement. Explain Fabry-Perot interferometric sensing principles.",
              co: "CO3",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Design a 4-channel wireless biomedical telemetry system for ambulatory cardiac monitoring. Specify carrier frequency, modulation, and packet structure.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain inductive power and data transmission for deep brain stimulation (DBS) implants. Analyze coil geometry and resonant coupling efficiency.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Analyze electrical safety hazards in intensive care units (ICU). Differentiate microshock from macroshock and detail isolated ground power systems (IPS).",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain the regulatory compliance pathways for Class II and Class III medical sensor devices under FDA 510(k) and EU Medical Device Regulation (MDR).",
              co: "CO5",
              bloom: "K3 (Apply)",
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
            text: "Design an ingestible wireless capsule endoscopy sensor system equipped with dual CMOS micro-cameras, pH sensing, and RF transceiver for gastrointestinal tract inspection. (a) Specify the power harvesting and micro-battery management to sustain 10 hours transit time. (b) Develop the image compression and RF telemetry scheme that transmits 30 fps without intestinal tissue heating. (c) Address biocompatibility and emergency magnetic retrieval protocols.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "Capsule hardware architecture (5 marks), RF telemetry and SAR safety (5 marks), biocompatibility and risk mitigation (5 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: "May 08, 2026",
      hodNote: "Paper thoroughly audited for medical device safety standards. All diagrams adhere to IEEE bioengineering format.",
    },
  },
  {
    id: "QP-2026-ECE-EC603",
    qpCode: "KVELL/ESE/2026/EC603-A",
    subjectCode: "EC603",
    subjectTitle: "VLSI Design & Embedded Systems",
    department: "Electronics & Communication Engineering",
    deptKey: "ece",
    facultyName: "Prof. S. Anand (Assistant Professor - ECE)",
    hodName: "Dr. M. Karthik (HOD - ECE)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 4,
    currentStageRole: "COE",
    status: "PENDING_COE_REVIEW",
    forwardedToCoe: true,
    forwardedDate: "May 12, 2026, 11:30 AM",
    approvedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeReferenceNo: "COE/DISPATCH/2026/0491",
    semester: "Semester VI",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set A",
    dateSubmitted: "May 12, 2026",
    timeSubmitted: "11:00 AM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "100% (Units I to V)",
    bloomsDistribution: {
      rememberUnderstand: 30,
      applyAnalyze: 50,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks: "Stage 3 (Associate Dean) clearance granted. Forwarded to COE for Stage 4 examination room encryption.",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Prof. S. Anand",
        status: "COMPLETED",
        timestamp: "May 11, 2026, 09:00 AM",
        sealOrReference: "FAC-ECE-019",
        remarks: "CMOS layout and RISC-V pipelined questions submitted.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Dr. M. Karthik",
        status: "COMPLETED",
        timestamp: "May 11, 2026, 04:30 PM",
        sealOrReference: "HOD/ECE/DAC-2026/033",
        remarks: "DAC Scrutiny passed. Forwarded to Associate Dean.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "COMPLETED",
        timestamp: "May 12, 2026, 11:30 AM",
        sealOrReference: "AD/ACAD/MOD-2026/091",
        remarks: "Academic scrutiny verified. Transmitted to Controller of Examinations.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "CURRENT",
        timestamp: "Received from AD",
        remarks: "Awaiting COE confidential room verification and submission to Chief COE.",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish",
        status: "PENDING",
      },
    ],
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "Define CMOS latch-up and state two layout mitigation techniques.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 2, text: "Calculate the logical effort of a 3-input NAND gate.", co: "CO1", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 3, text: "Explain Elmore delay model for RC tree interconnects.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 4, text: "What is clock skew and jitter in synchronous digital VLSI?", co: "CO2", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 5, text: "Contrast static CMOS logic with Dynamic Domino logic.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 6, text: "Define hold time and setup time violations in flip-flops.", co: "CO3", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 7, text: "What is Built-In Self-Test (BIST) in VLSI testing?", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 8, text: "State the Stuck-at-0 and Stuck-at-1 fault models.", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 9, text: "Differentiate between ARM Cortex-M4 and Cortex-A53 processor cores.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 10, text: "Explain priority inversion in real-time embedded operating systems (RTOS).", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Explain the complete CMOS n-well fabrication process sequence with cross-sectional diagrams and photolithography steps.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Derive the noise margins (NMH and NML) for a symmetric CMOS inverter. Plot voltage transfer characteristics (VTC).",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Design a 64-bit Carry Lookahead Adder (CLA). Analyze its area and propagation delay compared to a Ripple Carry Adder.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain 6T SRAM cell read, write, and hold stability. Diagram static noise margin (SNM) butterfly curves.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Explain scan-chain design for testability (DFT). Detail how automatic test pattern generation (ATPG) utilizes scan flip-flops.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Discuss low-power VLSI design techniques at circuit and architectural levels: Power gating, Multi-VDD, and Clock gating.",
              co: "CO3",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Explain the ARM AMBA AXI4 bus protocol architecture. Detail the 5 independent communication channels and burst transaction handshake.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Design an embedded automotive CAN-FD bus communication node using STM32 microcontroller. Detail frame structure and bit stuffing.",
              co: "CO4",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Compare Rate Monotonic Scheduling (RMS) with Earliest Deadline First (EDF) in FreeRTOS. Prove schedulability criteria with task sets.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Discuss memory management unit (MMU) and memory protection unit (MPU) in modern embedded systems. Detail virtual-to-physical address translation.",
              co: "CO5",
              bloom: "K3 (Apply)",
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
            text: "Design a RISC-V 5-stage pipelined processor core (IF, ID, EX, MEM, WB) with hazard detection and forwarding units. (a) Diagram the datapath indicating control signals for load-use and branch hazards. (b) Formulate the data forwarding equations for EX-to-EX and MEM-to-EX paths. (c) Quantify the throughput gain (CPI improvement) over an unpipelined single-cycle core.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "Datapath schematics with hazard logic (6 marks), forwarding multiplexer equations (5 marks), throughput analysis (4 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: true,
      date: "May 12, 2026",
      hodNote: "VLSI syllabus fully covered. Exam set verified against Anna University Autonomous guidelines.",
    },
  },
  {
    id: "QP-2026-MECH-ME405",
    qpCode: "KVELL/ESE/2026/ME405-B",
    subjectCode: "ME405",
    subjectTitle: "Applied Thermodynamics",
    department: "Mechanical Engineering",
    deptKey: "mech",
    facultyName: "Dr. T. Murugesan (Assistant Professor - MECH)",
    hodName: "Dr. V. Suresh (HOD - MECH)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 2,
    currentStageRole: "HOD",
    status: "RETURNED_TO_HOD",
    forwardedToCoe: false,
    semester: "Semester IV",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set B",
    dateSubmitted: "May 09, 2026",
    timeSubmitted: "03:45 PM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "90% (Unit IV needs rebalancing)",
    bloomsDistribution: {
      rememberUnderstand: 45,
      applyAnalyze: 45,
      evaluateCreate: 10,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4"],
    adRemarks: "Returned to Stage 2 (HOD): Part C Question 16 lacks higher-order evaluative complexity (K5/K6). Please replace with a multi-stage combined cycle problem and rebalance Unit IV psychrometric rubrics.",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. T. Murugesan",
        status: "COMPLETED",
        timestamp: "May 08, 2026, 02:00 PM",
        sealOrReference: "FAC-MECH-028",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Dr. V. Suresh",
        status: "RETURNED",
        timestamp: "May 09, 2026, 03:45 PM",
        sealOrReference: "HOD/MECH/DAC-2026/019",
        remarks: "Returned by Associate Dean for DAC revision of Part C.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "RETURNED",
        timestamp: "May 10, 2026, 04:00 PM",
        remarks: "Requires higher-order synthesis in Question 16.",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "PENDING",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish",
        status: "PENDING",
      },
    ],
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "State the First Law of Thermodynamics for an open steady flow system.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 2, text: "Define Carnot theorem and state its corollary.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 3, text: "What is cut-off ratio in a Diesel cycle and how does it influence thermal efficiency?", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 4, text: "Contrast Dual Combustion cycle with standard Otto cycle.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 5, text: "Explain reheat factor in multi-stage steam turbines.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 6, text: "Define dryness fraction (quality) of steam.", co: "CO3", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 7, text: "State Dalton's law of partial pressures for gas mixtures.", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 8, text: "What is wet bulb depression on a psychrometric chart?", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 9, text: "Define coefficient of performance (COP) of a vapor compression refrigerator.", co: "CO5", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 10, text: "Why are eco-friendly hydrofluoroolefins (HFOs) replacing R-134a refrigerants?", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "An air standard Otto cycle has a compression ratio of 8. At the start of compression, P1 = 100 kPa and T1 = 300 K. Heat supplied is 1800 kJ/kg. Calculate maximum temperature, maximum pressure, net work output, and thermal efficiency.",
              co: "CO1",
              bloom: "K3 (Apply)",
              marks: 13,
            },
            optionB: {
              text: "Derive the thermal efficiency expression for an air-standard Brayton cycle with regenerator in terms of pressure ratio and temperature ratio.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "In a Rankine cycle with superheat, steam enters turbine at 3 MPa, 350°C and condenses at 10 kPa. Calculate pump work, turbine work, thermal efficiency, and specific steam consumption using Mollier chart.",
              co: "CO2",
              bloom: "K3 (Apply)",
              marks: 13,
            },
            optionB: {
              text: "Explain the regenerative Rankine cycle with open feedwater heater. Derive the fraction of steam bled from the turbine.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Detail the critical pressure ratio derivation for sonic flow of steam through convergent-divergent nozzles.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Analyze velocity compounding (Curtis turbine) versus pressure compounding (Rateau turbine). Draw velocity triangles and pressure variations along blades.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Air at 30°C DBT and 60% RH enters an air handling unit at 100 m^3/min. It is cooled and dehumidified to 15°C DBT and 90% RH. Calculate cooling capacity and condensate water collected.",
              co: "CO4",
              bloom: "K3 (Apply)",
              marks: 13,
            },
            optionB: {
              text: "Detail summer air conditioning system layout with bypass factor calculation of cooling coils.",
              co: "CO4",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "In a vapor compression refrigeration cycle using R-134a, evaporator temp is -10°C and condenser temp is 40°C. Steam enters compressor dry saturated. Determine COP and power per ton of refrigeration.",
              co: "CO5",
              bloom: "K3 (Apply)",
              marks: 13,
            },
            optionB: {
              text: "Explain vapor absorption refrigeration system (VARS) using Aqua-Ammonia. Contrast it against VCRS with respect to energy source.",
              co: "CO5",
              bloom: "K2 (Understand)",
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
            text: "Explain the basic thermodynamic working principle of an industrial gas turbine combined cycle power plant with a schematic diagram. (Needs higher Bloom's rubric revision requested by Associate Dean).",
            co: "CO4",
            bloom: "K2 (Needs K5/K6)",
            marks: 15,
            rubricHint: "Flagged by Associate Dean: Question is primarily descriptive (K2) rather than evaluative/design calculation (K5/K6).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: true,
      moderationDoneByDept: false,
      date: "May 09, 2026",
      hodNote: "Submitted for initial Dean scrutiny. Awaiting guidance on Part C question weightage.",
    },
  },
  {
    id: "QP-2026-CSE-CS201",
    qpCode: "KVELL/ESE/2026/CS201-A",
    subjectCode: "CS201",
    subjectTitle: "Object Oriented Programming",
    department: "Computer Science and Engineering",
    deptKey: "cse",
    facultyName: "Dr. Ananya Menon (Assistant Professor - CSE)",
    hodName: "Prof. Jayapradha (HOD - CSE)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 2,
    currentStageRole: "HOD",
    status: "PENDING_HOD_REVIEW",
    forwardedToCoe: false,
    semester: "Semester IV",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set A",
    dateSubmitted: "May 13, 2026",
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
    adRemarks: "",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. Ananya Menon",
        status: "COMPLETED",
        timestamp: "May 13, 2026, 09:30 AM",
        sealOrReference: "FAC-CSE-041",
        remarks: "Question paper drafted strictly adhering to Autonomous Regulation 2021 curriculum and submitted to HOD for DAC scrutiny.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Prof. Jayapradha",
        status: "CURRENT",
        timestamp: "Awaiting HOD DAC Scrutiny",
        remarks: "Submitted by Faculty. Awaiting DAC scrutiny and endorsement to Associate Dean.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "PENDING",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "PENDING",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish",
        status: "PENDING",
      },
    ],
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "Define data abstraction and encapsulation in object-oriented systems.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 2, text: "Distinguish between method overloading and method overriding in Java.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 3, text: "What is dynamic method dispatch and how does the virtual table implement it?", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 4, text: "Explain the purpose of the final keyword when applied to methods and classes.", co: "CO2", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 5, text: "Calculate the output of a nested try-catch-finally block when an unchecked exception occurs.", co: "CO3", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 6, text: "Explain how abstract classes differ from interface contracts in Java 17.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 7, text: "What are bounded type parameters in Java generics? Give an illustrative code snippet.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 8, text: "Enumerate the states of a Java thread lifecycle and define Thread.sleep() vs Object.wait().", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 9, text: "Explain the Producer-Consumer synchronization barrier using java.util.concurrent.BlockingQueue.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 10, text: "Define lambda expressions and functional interfaces with @FunctionalInterface annotation.", co: "CO5", bloom: "K1 (Remember)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Design a comprehensive University Personnel hierarchy in Java utilizing abstract base classes, interfaces, and inheritance. Implement polymorphically calculated payroll.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain deep cloning versus shallow cloning in Java. Write a complete working code implementing Cloneable and demonstrating copy constructors.",
              co: "CO1",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Explain Java package access specifiers (public, protected, default, private) across modular boundaries. Detail classpath and module-info.java compilation.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Construct a custom checked exception framework for an autonomous vehicle telemetry system. Show try-with-resources with AutoCloseable interface.",
              co: "CO2",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Deconstruct the Java Collections Framework architecture. Contrast ArrayList vs LinkedList, and HashMap vs ConcurrentHashMap with internal bucketing and rehashing.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Write a generic PriorityQueue implementation with custom Comparator and Comparable interfaces for scheduling real-time task pipelines.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Explain multithreaded concurrency in Java. Detail volatile variables, synchronized blocks, explicit Lock objects, and ReentrantLock fairness flags.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Implement an ExecutorService thread pool pipeline that asynchronously fetches and processes university exam results using CompletableFuture.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Examine Java NIO.2 file channels and memory-mapped files. Write a code example demonstrating non-blocking asynchronous socket communication.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain the Stream API: filter, map, flatMap, reduce, and collect. Write parallel stream processing pipelines and discuss parallel stream overheads.",
              co: "CO5",
              bloom: "K3 (Apply)",
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
            text: "You are the Lead Systems Architect designing an Autonomous University Examination Evaluation & Result Publishing Engine in Java. (a) Design the class hierarchy and design patterns (Factory, Observer, and Strategy). (b) Implement thread-safe concurrent mark aggregation avoiding race conditions. (c) Devise an auditing and digital signature generation module for published grade sheets.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "Design pattern architecture (5 marks), multithreaded concurrency safety (5 marks), digital auditing and resilience (5 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: false,
      moderationDoneByDept: false,
      date: "May 13, 2026",
      hodNote: "Submitted by Faculty (Dr. Ananya Menon). Awaiting HOD DAC Scrutiny.",
    },
  },
  {
    id: "QP-2026-CSE-CS301",
    qpCode: "KVELL/ESE/2026/CS301-A",
    subjectCode: "CS301",
    subjectTitle: "Data Structures & Algorithms",
    department: "Computer Science and Engineering",
    deptKey: "cse",
    facultyName: "Dr. Ananya Menon (Assistant Professor - CSE)",
    hodName: "Prof. Jayapradha (HOD - CSE)",
    adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
    chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
    currentStageNumber: 1,
    currentStageRole: "Faculty",
    status: "RETURNED_TO_FACULTY",
    forwardedToCoe: false,
    semester: "Semester III",
    academicYear: "2025 - 2026",
    regulation: "Regulation 2021 (Autonomous)",
    examType: "End Semester Examination",
    set: "Set A",
    dateSubmitted: "May 12, 2026",
    timeSubmitted: "03:15 PM",
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "100% (Units I to V)",
    bloomsDistribution: {
      rememberUnderstand: 35,
      applyAnalyze: 45,
      evaluateCreate: 20,
    },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    adRemarks: "Returned by HOD (Prof. Jayapradha): Please revise Part C Question 16 to evaluate dynamic programming graph optimization with rubrics instead of descriptive traversal.",
    hierarchyTrail: [
      {
        stageNumber: 1,
        stageRole: "Faculty",
        officerTitle: "Subject Instructor",
        officerName: "Dr. Ananya Menon",
        status: "CURRENT",
        timestamp: "May 12, 2026, 03:15 PM",
        sealOrReference: "FAC-CSE-033",
        remarks: "Initial draft submitted. Currently in revision following HOD DAC feedback.",
      },
      {
        stageNumber: 2,
        stageRole: "HOD",
        officerTitle: "Head of Department",
        officerName: "Prof. Jayapradha",
        status: "RETURNED",
        timestamp: "May 12, 2026, 05:00 PM",
        remarks: "DAC Scrutiny: Please revise Question 16 in Part C. Current question is descriptive; replace with an evaluative dynamic programming / network flow design problem satisfying K5/K6 Bloom's level.",
      },
      {
        stageNumber: 3,
        stageRole: "AD",
        officerTitle: "Associate Dean (Academics)",
        officerName: "Dr. K. R. Ramanathan",
        status: "PENDING",
      },
      {
        stageNumber: 4,
        stageRole: "COE",
        officerTitle: "Controller of Examinations",
        officerName: "Dr. N. Balasubramanian",
        status: "PENDING",
      },
      {
        stageNumber: 5,
        stageRole: "Chief COE",
        officerTitle: "Chief University Controller",
        officerName: "Dr. Sathish",
        status: "PENDING",
      },
    ],
    parts: {
      partA: {
        instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
        questions: [
          { qNo: 1, text: "Define asymptotic notations Big-O, Big-Omega, and Big-Theta.", co: "CO1", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 2, text: "Explain amortized analysis with an example of dynamic array doubling.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 3, text: "State the balancing condition of an AVL tree and define balance factor.", co: "CO2", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 4, text: "Differentiate between B-Tree and B+ Tree indexing in database storage.", co: "CO2", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 5, text: "Explain open addressing versus chaining for hash table collision resolution.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 6, text: "Calculate the worst-case and average-case time complexities of Quicksort.", co: "CO3", bloom: "K3 (Apply)", marks: 2 },
          { qNo: 7, text: "State the cut property in Minimum Spanning Trees (MST).", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 8, text: "Why does Dijkstra's algorithm fail with negative edge weights? Name an alternative.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
          { qNo: 9, text: "Define the optimal substructure property in dynamic programming.", co: "CO5", bloom: "K1 (Remember)", marks: 2 },
          { qNo: 10, text: "Distinguish between NP-Complete and NP-Hard decision problems.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
        ],
      },
      partB: {
        instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
        questions: [
          {
            qNo: 11,
            optionA: {
              text: "Explain Red-Black tree insertion with case-by-case rotation and recoloring diagrams.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Detail Splay Trees and amortized analysis of zig, zig-zig, and zig-zag splay operations.",
              co: "CO1",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 12,
            optionA: {
              text: "Implement a Binomial Heap with union, insert, and extract-min operations. Analyze time complexities.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain Fibonacci Heaps and how decrease-key runs in amortized O(1) time using cascading cuts.",
              co: "CO2",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 13,
            optionA: {
              text: "Derive Bellman-Ford shortest path algorithm and prove its ability to detect negative-weight cycles.",
              co: "CO3",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain Floyd-Warshall all-pairs shortest path algorithm with intermediate vertex dynamic programming formulation.",
              co: "CO3",
              bloom: "K3 (Apply)",
              marks: 13,
            },
          },
          {
            qNo: 14,
            optionA: {
              text: "Deconstruct Edmonds-Karp maximum network flow algorithm based on Ford-Fulkerson method.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Explain Hopcroft-Karp algorithm for maximum cardinality bipartite matching.",
              co: "CO4",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
          },
          {
            qNo: 15,
            optionA: {
              text: "Formulate dynamic programming solution for the 0/1 Knapsack problem and Matrix Chain Multiplication.",
              co: "CO5",
              bloom: "K4 (Analyze)",
              marks: 13,
            },
            optionB: {
              text: "Detail the Traveling Salesperson Problem using dynamic programming with bitmask state representation.",
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
            text: "Design an optimized algorithmic routing engine for KVELL Smart Campus Autonomous Shuttle System connecting 25 academic zones. (a) Formulate the graph representation with dynamic congestion weights. (b) Formulate an evaluative algorithm combining A* heuristic search with contraction hierarchies. (c) Prove correctness and analyze query latency bounds.",
            co: "CO5",
            bloom: "K6 (Create)",
            marks: 15,
            rubricHint: "Graph formulation (5 marks), algorithm design and heuristic admissibility (5 marks), correctness proof and latency analysis (5 marks).",
          },
        ],
      },
    },
    hodDeclaration: {
      certifiedByHod: false,
      moderationDoneByDept: false,
      date: "May 12, 2026",
      hodNote: "Returned for revision by HOD (Prof. Jayapradha). Awaiting faculty resubmission.",
    },
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

  let currentStageNumber: HierarchyStageNumber = 3;
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

  const status = p.status || "PENDING_AD_REVIEW";

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

/** The question papers the signed-in user may see (from the server; see services/questionPapersApi). */
export function safeLoadQuestionPapers(): QuestionPaperItem[] {
  return cachedQuestionPapers();
}

export interface QuestionPaperReviewViewProps {
  onToast?: (msg: string) => void;
}

export const QuestionPaperReviewView: React.FC<QuestionPaperReviewViewProps> = ({ onToast }) => {
  const { papers, loading, error: loadError } = useQuestionPapers();

  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal review state
  const [activePaperModal, setActivePaperModal] = useState<QuestionPaperItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"hierarchy" | "specifications" | "partA" | "partB" | "partC" | "officialPreview" | "pdf">("hierarchy");
  const [deanNotesInput, setDeanNotesInput] = useState<string>("");
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [pdfModalOpen, setPdfModalState] = useState<{
    fileName: string;
    fileData: string;
  } | null>(null);
  // Stored PDFs are fetched from the server when opened
  const setPdfModalOpen = (v: { fileName: string; fileData: string } | null) => {
    if (!v) return setPdfModalState(null);
    resolvePdfUrl(v.fileData)
      .then((url) => setPdfModalState({ ...v, fileData: url }))
      .catch((e) => alert(apiErrorMessage(e, "Could not open the PDF.")));
  };

  // Quick Action Confirm Modal
  const [confirmDialog, setConfirmDialog] = useState<{
    action: "forward_coe" | "forward_chief_coe" | "chief_coe_release" | "return_hod" | "return_faculty";
    paper: QuestionPaperItem;
  } | null>(null);

  const activePdfUrl = usePdfUrl(activePaperModal?.pdfAttachment?.fileData);

  // Reload the list from the server
  const handleResetData = () => {
    void refreshQuestionPapers().then(() => onToast?.("Question papers reloaded from the server."));
  };

  // KPI Calculations across stages with defensive checks
  const stats = useMemo(() => {
    const total = papers.length;
    const stage2Hod = papers.filter((p) => p.currentStageNumber === 2).length;
    const stage3Ad = papers.filter((p) => p.currentStageNumber === 3).length;
    const stage4Coe = papers.filter((p) => p.currentStageNumber === 4).length;
    const stage5Chief = papers.filter((p) => p.status === "CHIEF_COE_APPROVED").length;
    const returned = papers.filter((p) => (p.status || "").startsWith("RETURNED_TO")).length;
    return { total, stage2Hod, stage3Ad, stage4Coe, stage5Chief, returned };
  }, [papers]);

  // Filtered List with defensive optional chaining
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      const matchDept = selectedDept === "all" || p.deptKey === selectedDept;
      const matchStage =
        selectedStage === "all" ||
        (selectedStage === "ad" && p.currentStageNumber === 3) ||
        (selectedStage === "coe" && p.currentStageNumber === 4) ||
        (selectedStage === "chief" && p.status === "CHIEF_COE_APPROVED") ||
        (selectedStage === "returned" && (p.status || "").startsWith("RETURNED_TO"));

      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        (p.subjectCode || "").toLowerCase().includes(q) ||
        (p.subjectTitle || "").toLowerCase().includes(q) ||
        (p.department || "").toLowerCase().includes(q) ||
        (p.hodName || "").toLowerCase().includes(q) ||
        (p.facultyName || "").toLowerCase().includes(q) ||
        (p.qpCode || "").toLowerCase().includes(q);

      return matchDept && matchStage && matchQuery;
    });
  }, [papers, selectedDept, selectedStage, searchQuery]);

  // Open review modal
  const handleOpenReview = (paper: QuestionPaperItem) => {
    setActivePaperModal(paper);
    setActiveModalTab("hierarchy");
    setDeanNotesInput(paper.adRemarks || "");
  };

  const runAction = async (
    paperId: string,
    action: PaperAction,
    options: Parameters<typeof questionPaperAction>[2],
    success: (p: QuestionPaperItem) => string
  ) => {
    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return;
    setIsProcessingAction(true);
    try {
      const updated = await questionPaperAction(paper, action, options);
      setConfirmDialog(null);
      if (activePaperModal && activePaperModal.id === paperId) setActivePaperModal(updated);
      onToast?.(success(updated));
    } catch (e) {
      alert(apiErrorMessage(e, "The action could not be completed."));
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Stage 3 -> Stage 4: Associate Dean approves and forwards to the COE
  const handleAdApproveAndForwardToCOE = (paperId: string, customRemarks?: string) => {
    const remarks = customRemarks?.trim() || deanNotesInput.trim() || undefined;
    void runAction(paperId, "APPROVE", { remarks }, (p) =>
      `Question paper ${p.subjectCode} approved by the Associate Dean and forwarded to the COE.`);
  };

  // Stage 4 -> Stage 5: COE forwards to the Chief COE
  const handleCoeForwardToChiefCOE = (paperId: string) => {
    void runAction(paperId, "FORWARD", {}, (p) =>
      `Question paper ${p.subjectCode} forwarded to the Chief COE (reference ${p.coeReferenceNo}).`);
  };

  // Stage 5: Chief COE releases the paper with the seal
  const handleChiefCoeAuthorizeRelease = (paperId: string) => {
    void runAction(paperId, "RELEASE", {}, (p) =>
      `Question paper ${p.subjectCode} released by the Chief COE (seal ${p.chiefCoeSealNo}).`);
  };

  // Return to an earlier stage with the reason
  const handleReturnPaper = (paperId: string, returnTarget: "HOD" | "Faculty", returnRemarks?: string) => {
    const finalRemarks = returnRemarks?.trim() || deanNotesInput.trim();
    if (finalRemarks.length < 5) {
      alert(`Please give the reason (at least 5 characters) for returning the paper to the ${returnTarget}.`);
      return;
    }
    void runAction(paperId, "RETURN", { returnTo: returnTarget, remarks: finalRemarks }, () =>
      `Question paper returned to the ${returnTarget} for revision.`);
  };

  return (
    <div className="space-y-6">
      {(loading || loadError) && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${loadError ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {loadError || "Loading question papers..."}
        </div>
      )}
      {/* Top Banner - 5-Stage Hierarchy Governance */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/40 text-[10px] font-black uppercase px-3 py-1 rounded tracking-wider shadow-xs flex items-center gap-1.5">
                <ShieldCheck size={13} />
                5-STAGE EXAMINATION GOVERNANCE HIERARCHY
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-1 rounded tracking-wider">
                PORT 3000 / 3002 PIPELINE
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Question Paper &amp; Mark Review Permission Hierarchy
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Standardized linear governance:{" "}
              <strong className="text-[#D4A72C]">
                1. Faculty Author ➔ 2. HOD (DAC Scrutiny) ➔ 3. Associate Dean (AD Moderation) ➔ 4. COE (Logistics) ➔ 5. Chief COE (Executive Master Seal)
              </strong>
              . At Stage 3, the Associate Dean conducts rigorous academic moderation before authorizing transmission to the COE.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto shrink-0">
            <button
              onClick={handleResetData}
              title="Reload the question papers from the server"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 5-Step Visual Stepper Ribbon */}
        <div className="bg-[#081322] p-4 rounded-2xl border border-white/10 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] text-xs">
            {/* Step 1: Faculty */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 font-black flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <p className="font-extrabold text-white text-[11px]">Faculty</p>
                <p className="text-[10px] text-slate-400">Course Instructor Draft</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 2: HOD */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <p className="font-extrabold text-white text-[11px]">HOD</p>
                <p className="text-[10px] text-slate-400">DAC Scrutiny Endorsement</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 3: Associate Dean */}
            <div className="flex items-center gap-2.5 bg-[#D4A72C]/15 border border-[#D4A72C]/40 px-3 py-1.5 rounded-xl">
              <span className="h-7 w-7 rounded-full bg-[#D4A72C] text-[#0B192C] font-black flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <p className="font-black text-[#D4A72C] text-[11px]">Associate Dean (AD)</p>
                <p className="text-[10px] text-slate-300 font-semibold">Academic Moderation (Current)</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 4: COE */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 font-black flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <p className="font-extrabold text-white text-[11px]">COE</p>
                <p className="text-[10px] text-slate-400">Logistics &amp; Confidential Sets</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 5: Chief COE */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black flex items-center justify-center shrink-0">
                <Crown size={13} />
              </span>
              <div>
                <p className="font-extrabold text-white text-[11px]">Chief COE</p>
                <p className="text-[10px] text-slate-400">Dr. Sathish Master Seal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Stage 3 AD Review (Pending here) */}
        <div
          onClick={() => setSelectedStage("ad")}
          className={`bg-white p-5 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between ${
            stats.stage3Ad > 0
              ? "border-amber-400 bg-amber-50/25 shadow-md"
              : "border-[#E5E1D8] shadow-xs hover:border-[#D4A72C]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                  STAGE 3: AWAITING AD REVIEW
                </span>
                {stats.stage3Ad > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <span className="font-display font-black text-3xl text-amber-800 mt-1 block">
                {stats.stage3Ad}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] font-bold text-amber-800">
            <span>Holding at AD Panel</span>
            <span className="flex items-center gap-0.5">
              Filter Stage 3 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Stage 4 COE In-Queue */}
        <div
          onClick={() => setSelectedStage("coe")}
          className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-xs cursor-pointer hover:border-purple-500 transition flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-purple-700 tracking-wider">
                STAGE 4: TRANSMITTED TO COE
              </span>
              <span className="font-display font-black text-3xl text-purple-700 mt-1 block">
                {stats.stage4Coe}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between text-[11px] font-bold text-purple-700">
            <span>Approved by AD ➔ With COE</span>
            <span className="flex items-center gap-0.5">
              Filter Stage 4 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Stage 5 Chief COE Master Release */}
        <div
          onClick={() => setSelectedStage("chief")}
          className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-xs cursor-pointer hover:border-emerald-500 transition flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                STAGE 5: CHIEF COE MASTER SEAL
              </span>
              <span className="font-display font-black text-3xl text-emerald-700 mt-1 block">
                {stats.stage5Chief}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
              <Crown size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span>Officially Released for Conduction</span>
            <span className="flex items-center gap-0.5">
              Filter Stage 5 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Returned for Revision */}
        <div
          onClick={() => setSelectedStage("returned")}
          className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-xs cursor-pointer hover:border-red-400 transition flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-rose-700 tracking-wider">
                RETURNED FOR REVISION
              </span>
              <span className="font-display font-black text-3xl text-rose-700 mt-1 block">
                {stats.returned}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
              <RotateCcw size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[11px] font-bold text-rose-700">
            <span>Returned to HOD or Faculty</span>
            <span className="flex items-center gap-0.5">
              Filter Returned <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-4 sm:p-5 shadow-xs flex flex-wrap items-center gap-4">
        {/* Department Filter */}
        <div className="min-w-[180px] flex-1">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            DEPARTMENT
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full text-xs font-bold text-[#0B192C] bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4A72C]"
          >
            <option value="all">All Departments (12)</option>
            <option value="cse">Computer Science &amp; Engineering</option>
            <option value="aids">Artificial Intelligence &amp; Data Science</option>
            <option value="bme">Biomedical Engineering</option>
            <option value="ece">Electronics &amp; Communication</option>
            <option value="mech">Mechanical Engineering</option>
          </select>
        </div>

        {/* Stage Filter */}
        <div className="min-w-[180px] flex-1">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            HIERARCHY STAGE
          </label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full text-xs font-bold text-[#0B192C] bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4A72C]"
          >
            <option value="all">All Stages ({papers.length})</option>
            <option value="ad">Stage 3: Associate Dean Review ({stats.stage3Ad})</option>
            <option value="coe">Stage 4: COE Examination Wing ({stats.stage4Coe})</option>
            <option value="chief">Stage 5: Chief COE Master Release ({stats.stage5Chief})</option>
            <option value="returned">Returned for Revision ({stats.returned})</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="min-w-[220px] flex-2">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            SEARCH BY CODE, TITLE, INSTRUCTOR OR HOD
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CS601, Deep Learning, Jayapradha, Rajesh..."
              className="w-full text-xs font-semibold pl-9 pr-4 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl text-[#0B192C] focus:outline-none focus:border-[#D4A72C]"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedDept !== "all" || selectedStage !== "all" || searchQuery) && (
          <div className="self-end pb-1">
            <button
              onClick={() => {
                setSelectedDept("all");
                setSelectedStage("all");
                setSearchQuery("");
              }}
              className="text-xs font-bold text-gray-500 hover:text-[#0B192C] underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main List of Question Papers with 5-Stage Status */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#D4A72C] uppercase tracking-wider mb-1">
              <CheckSquare size={15} />
              EXAMINATION GOVERNANCE QUEUE · 5-TIER CLEARANCE
            </div>
            <h2 className="font-display font-bold text-xl text-[#0B192C]">
              Department Question Papers in Governance Chain
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click &quot;Review &amp; Moderate&quot; to inspect questions, verify Bloom&apos;s Taxonomy, and sign off custody to the COE.
            </p>
          </div>

          <div className="text-xs font-extrabold text-gray-500 bg-[#F8F5EE] px-3.5 py-2 rounded-xl border border-[#E5E1D8] shrink-0">
            Showing <span className="text-[#0B192C]">{filteredPapers.length}</span> of {papers.length} Papers
          </div>
        </div>

        {filteredPapers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <HelpCircle size={32} className="mx-auto text-gray-400" />
            <p className="text-sm font-bold text-gray-700">No question papers match your filters</p>
            <p className="text-xs text-gray-400">Try selecting a different department or stage filter above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPapers.map((paper) => {
              const isAtAdStage = paper.currentStageNumber === 3 && paper.status === "PENDING_AD_REVIEW";
              const isAtCoeStage = paper.currentStageNumber === 4 && paper.status === "PENDING_COE_REVIEW";
              const isChiefApproved = paper.status === "CHIEF_COE_APPROVED";
              const isReturned = paper.status.startsWith("RETURNED_TO");

              return (
                <div
                  key={paper.id}
                  className={`p-5 sm:p-6 transition hover:bg-[#FAF8F5] flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                    isAtAdStage ? "bg-amber-50/15" : ""
                  }`}
                >
                  {/* Left: Code, Title, Dept, Hierarchy tracker, and Metadata */}
                  <div className="space-y-3.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-black text-sm bg-[#0B192C] text-[#D4A72C] px-2.5 py-1 rounded-lg">
                        {paper.subjectCode}
                      </span>
                      <span className="text-xs font-extrabold text-gray-500 font-mono">
                        {paper.qpCode} ({paper.set})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                        {paper.examType}
                      </span>

                      {/* Stage Pill */}
                      {isAtAdStage && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Clock size={11} className="animate-spin text-amber-700" />
                          STAGE 3: AWAITING ASSOCIATE DEAN APPROVAL
                        </span>
                      )}
                      {isAtCoeStage && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-800 border border-purple-300 flex items-center gap-1">
                          <ShieldCheck size={12} className="text-purple-700" />
                          STAGE 4: APPROVED BY AD ➔ WITH COE
                        </span>
                      )}
                      {isChiefApproved && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Crown size={12} className="text-emerald-700" />
                          STAGE 5: MASTER SEAL RELEASED (CHIEF COE)
                        </span>
                      )}
                      {isReturned && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertCircle size={12} className="text-rose-700" />
                          {paper.status === "RETURNED_TO_HOD" ? "RETURNED TO STAGE 2 (HOD)" : "RETURNED TO STAGE 1 (FACULTY)"}
                        </span>
                      )}

                      {/* PDF Document Attached Badge */}
                      {paper.pdfAttachment && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <FileText size={11} className="text-amber-700" />
                          PDF: {paper.pdfAttachment.fileName} ({paper.pdfAttachment.fileSize})
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display font-black text-lg text-[#0B192C]">
                        {paper.subjectTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-gray-800">
                          <Building2 size={13} className="text-[#D4A72C]" />
                          {paper.department}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User size={13} className="text-blue-600" />
                          Faculty: <strong className="text-gray-800">{paper.facultyName}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <UserCheck size={13} className="text-amber-600" />
                          HOD: <strong className="text-gray-800">{paper.hodName}</strong>
                        </span>
                      </div>
                    </div>

                    {/* 5-Stage Mini Progress Bar */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-gray-200/90 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-gray-500">
                        <span>Governance Custody:</span>
                        <span className="text-[#0B192C] font-mono">
                          Current: {paper.currentStageRole} (Stage {paper.currentStageNumber}/5)
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-extrabold">
                        {paper.hierarchyTrail.map((sig) => {
                          const isDone = sig.status === "COMPLETED";
                          const isCur = sig.status === "CURRENT";
                          const isRet = sig.status === "RETURNED";

                          return (
                            <div
                              key={sig.stageNumber}
                              className={`py-1.5 px-1 rounded-lg border transition ${
                                isDone
                                  ? "bg-emerald-100/90 text-emerald-900 border-emerald-300"
                                  : isCur
                                  ? "bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300 font-black animate-pulse"
                                  : isRet
                                  ? "bg-rose-100 text-rose-900 border-rose-300"
                                  : "bg-gray-100 text-gray-400 border-gray-200"
                              }`}
                            >
                              <div className="truncate">{sig.stageNumber}. {sig.stageRole}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Meta tags and seals */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                      <span className="bg-[#F8F5EE] px-2.5 py-1 rounded-lg border border-[#E5E1D8] text-gray-700">
                        100 Marks (3 Hrs)
                      </span>
                      <span className="bg-[#F8F5EE] px-2.5 py-1 rounded-lg border border-[#E5E1D8] text-gray-700">
                        Part A (20M) + Part B (65M) + Part C (15M)
                      </span>
                      <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200">
                        Syllabus: {paper.syllabusCoverage}
                      </span>
                      <span className="bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200">
                        Bloom&apos;s: K1-K2 ({paper.bloomsDistribution?.rememberUnderstand ?? 30}%) | K3-K4 ({paper.bloomsDistribution?.applyAnalyze ?? 50}%) | K5-K6 ({paper.bloomsDistribution?.evaluateCreate ?? 20}%)
                      </span>

                      {paper.coeReferenceNo && (
                        <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-300 font-mono font-black text-[10px]">
                          COE: {paper.coeReferenceNo}
                        </span>
                      )}

                      {paper.chiefCoeSealNo && (
                        <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-300 font-mono font-black text-[10px]">
                          MASTER SEAL: {paper.chiefCoeSealNo}
                        </span>
                      )}
                    </div>

                    {/* Scrutiny notes */}
                    {paper.adRemarks && (
                      <div
                        className={`text-xs p-3 rounded-2xl border ${
                          isChiefApproved
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                            : isReturned
                            ? "bg-rose-50/70 border-rose-200 text-rose-900"
                            : "bg-gray-50 border-gray-200 text-gray-700"
                        }`}
                      >
                        <strong className="font-extrabold uppercase text-[10px] block mb-0.5 tracking-wider">
                          Scrutiny / Feedback Record:
                        </strong>
                        <p className="italic">&ldquo;{paper.adRemarks}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-end gap-2.5 shrink-0 pt-2 lg:pt-0">
                    <button
                      onClick={() => handleOpenReview(paper)}
                      className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-extrabold transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} className="text-[#D4A72C]" />
                      <span>Review &amp; Moderate</span>
                    </button>

                    {paper.pdfAttachment && (
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: paper.pdfAttachment!.fileName,
                            fileData: paper.pdfAttachment!.fileData,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="View Uploaded Question Paper PDF"
                      >
                        <FileText size={14} className="text-amber-700" />
                        <span>View PDF</span>
                      </button>
                    )}

                    {/* Stage 3 Action: AD approves and forwards to Stage 4 COE */}
                    {isAtAdStage && (
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            action: "forward_coe",
                            paper,
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow flex items-center gap-1.5 cursor-pointer"
                        title="Authorize question paper and forward directly to Controller of Examinations (Stage 4)"
                      >
                        <ShieldCheck size={14} />
                        <span>Approve &amp; Forward to COE</span>
                      </button>
                    )}

                    {/* Stage 4 Action: Forward to Chief COE */}
                    {isAtCoeStage && (
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            action: "forward_chief_coe",
                            paper,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <Crown size={14} />
                        <span>COE ➔ Chief COE</span>
                      </button>
                    )}

                    {/* Stage 5 Action: Released */}
                    {isChiefApproved && (
                      <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Lock size={12} />
                        <span>Released by Chief COE</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPREHENSIVE QUESTION PAPER REVIEW MODAL */}
      {activePaperModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white p-5 sm:p-6 border-b border-[#D4A72C]/30 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs bg-[#D4A72C] text-[#0B192C] px-2.5 py-0.5 rounded">
                    {activePaperModal.subjectCode}
                  </span>
                  <span className="text-xs text-slate-300 font-bold">
                    {activePaperModal.qpCode} ({activePaperModal.set})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/10 text-[#D4A72C] border border-[#D4A72C]/30">
                    {activePaperModal.examType}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                    Stage {activePaperModal.currentStageNumber}: {activePaperModal.currentStageRole}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {activePaperModal.subjectTitle}
                </h2>
                <p className="text-xs text-slate-300">
                  {activePaperModal.department} • Faculty: <strong className="text-white">{activePaperModal.facultyName}</strong> • HOD: <strong className="text-white">{activePaperModal.hodName}</strong>
                </p>
              </div>

              <button
                onClick={() => setActivePaperModal(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="bg-[#FAF8F5] px-5 sm:px-6 py-2.5 border-b border-gray-200 flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveModalTab("hierarchy")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "hierarchy"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                <ShieldCheck size={14} className="text-[#D4A72C]" />
                <span>5-Stage Governance Trail</span>
              </button>

              <button
                onClick={() => setActiveModalTab("specifications")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "specifications"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Specifications &amp; Rubrics
              </button>

              <button
                onClick={() => setActiveModalTab("partA")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "partA"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Part A (10 × 2 = 20M)
              </button>

              <button
                onClick={() => setActiveModalTab("partB")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "partB"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Part B (5 × 13 = 65M)
              </button>

              <button
                onClick={() => setActiveModalTab("partC")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "partC"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Part C (1 × 15 = 15M)
              </button>

              <button
                onClick={() => setActiveModalTab("officialPreview")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "officialPreview"
                    ? "bg-[#D4A72C] text-[#0B192C] shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                <Printer size={13} />
                <span>Official QP Preview</span>
              </button>

              <button
                onClick={() => setActiveModalTab("pdf")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "pdf"
                    ? "bg-[#D4A72C] text-[#0B192C] shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                <FileText size={13} />
                <span>Uploaded Faculty PDF</span>
                {activePaperModal.pdfAttachment && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Modal Body Scrollable Area */}
            <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
              {/* TAB: 5-Stage Governance Trail */}
              {activeModalTab === "hierarchy" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-[#0B192C] text-white border border-[#D4A72C]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                        PERMISSION PIPELINE: FACULTY ➔ HOD ➔ AD ➔ COE ➔ CHIEF COE
                      </span>
                      <h3 className="font-display font-extrabold text-base text-white mt-0.5">
                        Chain of Custody &amp; Verification Signatures
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Every stage requires authenticated sign-off before advancing to the next authority.
                      </p>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white font-mono font-bold text-xs">
                      Current: Stage {activePaperModal.currentStageNumber} ({activePaperModal.currentStageRole})
                    </div>
                  </div>

                  {/* Uploaded Faculty PDF Document Quick Access Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                        <FileText className="text-amber-800" size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#0B192C]">
                            {activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                          </h4>
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                            Faculty PDF
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {activePaperModal.pdfAttachment?.fileSize || "245 KB"} &bull; Uploaded by {activePaperModal.facultyName} on {activePaperModal.pdfAttachment?.uploadedAt || activePaperModal.dateSubmitted}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`,
                            fileData: activePaperModal.pdfAttachment?.fileData || "",
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye size={13} className="text-[#D4A72C]" />
                        <span>Inspect PDF</span>
                      </button>
                      <button
                        onClick={() => setActiveModalTab("pdf")}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0B192C] border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink size={13} />
                        <span>Open in Tab</span>
                      </button>
                      <a
                        href={activePdfUrl || undefined}
                        download={activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                        className="px-3.5 py-2 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black hover:bg-amber-400 transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* 5-Stage Step Cards */}
                  <div className="space-y-4">
                    {activePaperModal.hierarchyTrail.map((sig) => {
                      const isCompleted = sig.status === "COMPLETED";
                      const isCurrent = sig.status === "CURRENT";
                      const isReturned = sig.status === "RETURNED";

                      return (
                        <div
                          key={sig.stageNumber}
                          className={`p-4 sm:p-5 rounded-2xl border-2 transition ${
                            isCompleted
                              ? "bg-emerald-50/40 border-emerald-300"
                              : isCurrent
                              ? "bg-amber-50/50 border-amber-400 ring-2 ring-amber-200"
                              : isReturned
                              ? "bg-rose-50/50 border-rose-300"
                              : "bg-gray-50 border-gray-200 opacity-60"
                          } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-600 text-white"
                                  : isCurrent
                                  ? "bg-amber-500 text-slate-950 animate-pulse"
                                  : isReturned
                                  ? "bg-rose-600 text-white"
                                  : "bg-gray-300 text-gray-700"
                              }`}
                            >
                              {sig.stageNumber}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-[#0B192C]">
                                  Stage {sig.stageNumber}: {sig.stageRole} ({sig.officerTitle})
                                </h4>
                                {isCompleted && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                    Signed Off
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                                    In Review
                                  </span>
                                )}
                                {isReturned && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-200 text-rose-900">
                                    Returned
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-gray-700">
                                Officer: {sig.officerName}
                              </p>
                              {sig.timestamp && (
                                <p className="text-[11px] text-gray-500">
                                  Timestamp: {sig.timestamp}
                                </p>
                              )}
                              {sig.remarks && (
                                <p className="text-xs text-gray-600 italic pt-1">
                                  &ldquo;{sig.remarks}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          {sig.sealOrReference && (
                            <div className="sm:text-right shrink-0">
                              <span className="text-[10px] font-extrabold uppercase text-gray-400 block">
                                Digital Seal / Reference
                              </span>
                              <span className="font-mono font-black text-xs text-[#0B192C] bg-white px-2.5 py-1 rounded border border-gray-200 inline-block mt-0.5">
                                {sig.sealOrReference}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: Specifications & Bloom's */}
              {activeModalTab === "specifications" && (
                <div className="space-y-6">
                  {/* Spec Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block">
                        EXAMINATION &amp; SET
                      </span>
                      <p className="font-bold text-sm text-[#0B192C] mt-1">
                        {activePaperModal.examType} ({activePaperModal.set})
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        Ref: {activePaperModal.qpCode}
                      </p>
                    </div>

                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block">
                        TOTAL MARKS &amp; TIME
                      </span>
                      <p className="font-bold text-sm text-[#0B192C] mt-1">
                        {activePaperModal.maxMarks} Marks • {activePaperModal.durationHours} Hours
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Regulation: {activePaperModal.regulation}
                      </p>
                    </div>

                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block">
                        SYLLABUS &amp; CO COVERAGE
                      </span>
                      <p className="font-bold text-sm text-[#0B192C] mt-1">
                        {activePaperModal.syllabusCoverage}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-mono font-bold text-blue-700">
                        {activePaperModal.courseOutcomesCovered.join(" • ")}
                      </div>
                    </div>
                  </div>

                  {/* Bloom's Taxonomy Distribution */}
                  <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-gray-200 space-y-3">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#D4A72C]" />
                      Bloom&apos;s Taxonomy Question Weightage Analysis
                    </h4>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                          <span>Remember &amp; Understand (K1 - K2)</span>
                          <span>{activePaperModal.bloomsDistribution?.rememberUnderstand ?? 30}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${activePaperModal.bloomsDistribution?.rememberUnderstand ?? 30}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                          <span>Apply &amp; Analyze (K3 - K4)</span>
                          <span>{activePaperModal.bloomsDistribution?.applyAnalyze ?? 50}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full transition-all"
                            style={{ width: `${activePaperModal.bloomsDistribution?.applyAnalyze ?? 50}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                          <span>Evaluate &amp; Create (K5 - K6 / Higher Order)</span>
                          <span>{activePaperModal.bloomsDistribution?.evaluateCreate ?? 20}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${activePaperModal.bloomsDistribution?.evaluateCreate ?? 20}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HOD Endorsement Declaration */}
                  <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                      <CheckCircle2 size={16} className="text-amber-700" />
                      Departmental Academic Committee (DAC) &amp; HOD Endorsement
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed italic">
                      &ldquo;{activePaperModal.hodDeclaration?.hodNote || "Endorsed by Departmental Academic Committee."}&rdquo;
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-gray-500 border-t border-amber-200/60">
                      <span>Submitted by: <strong>{activePaperModal.hodName}</strong></span>
                      <span>Faculty Author: <strong>{activePaperModal.facultyName}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Part A Questions */}
              {activeModalTab === "partA" && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{activePaperModal.parts.partA.instructions}</span>
                    <span className="text-[#0B192C]">Total: 20 Marks</span>
                  </div>

                  <div className="space-y-3">
                    {activePaperModal.parts.partA.questions.map((q) => (
                      <div
                        key={q.qNo}
                        className="p-4 rounded-2xl border border-gray-200 hover:border-gray-300 bg-white transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="h-6 w-6 rounded-full bg-[#0B192C] text-[#D4A72C] font-black text-xs flex items-center justify-center shrink-0">
                              {q.qNo}
                            </span>
                            <p className="text-xs font-bold text-[#0B192C] leading-relaxed">
                              {q.text}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 shrink-0">
                            [{q.marks} Marks]
                          </span>
                        </div>

                        <div className="pl-9 flex items-center gap-2 text-[10px] font-mono font-bold">
                          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                            CO: {q.co}
                          </span>
                          <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                            Bloom: {q.bloom}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Part B Questions */}
              {activeModalTab === "partB" && (
                <div className="space-y-5">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{activePaperModal.parts.partB.instructions}</span>
                    <span className="text-[#0B192C]">Total: 65 Marks</span>
                  </div>

                  <div className="space-y-6">
                    {activePaperModal.parts.partB.questions.map((q) => (
                      <div
                        key={q.qNo}
                        className="p-5 rounded-2xl border-2 border-gray-200 bg-white space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="font-extrabold text-sm text-[#0B192C]">
                            Question {q.qNo} (Either / Or Choice)
                          </span>
                          <span className="font-mono font-bold text-xs bg-gray-100 px-2.5 py-1 rounded text-gray-800">
                            [13 Marks]
                          </span>
                        </div>

                        {/* Option (a) */}
                        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-gray-200/80 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-extrabold text-xs text-blue-700">
                              ({q.qNo}.a)
                            </span>
                            <p className="text-xs font-bold text-gray-900 flex-1 leading-relaxed">
                              {q.optionA.text}
                            </p>
                            <span className="font-mono text-xs text-gray-500 font-bold">
                              [13M]
                            </span>
                          </div>

                          <div className="pl-6 flex items-center gap-2 text-[10px] font-mono font-bold pt-1">
                            <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                              CO: {q.optionA.co}
                            </span>
                            <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                              Bloom: {q.optionA.bloom}
                            </span>
                          </div>
                        </div>

                        {/* OR Divider */}
                        <div className="relative text-center my-1">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                          </div>
                          <span className="relative bg-white px-4 text-xs font-black uppercase text-gray-400">
                            OR
                          </span>
                        </div>

                        {/* Option (b) */}
                        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-gray-200/80 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-extrabold text-xs text-emerald-700">
                              ({q.qNo}.b)
                            </span>
                            <p className="text-xs font-bold text-gray-900 flex-1 leading-relaxed">
                              {q.optionB.text}
                            </p>
                            <span className="font-mono text-xs text-gray-500 font-bold">
                              [13M]
                            </span>
                          </div>

                          <div className="pl-6 flex items-center gap-2 text-[10px] font-mono font-bold pt-1">
                            <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                              CO: {q.optionB.co}
                            </span>
                            <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                              Bloom: {q.optionB.bloom}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Part C Questions */}
              {activeModalTab === "partC" && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{activePaperModal.parts.partC.instructions}</span>
                    <span className="text-[#0B192C]">Total: 15 Marks</span>
                  </div>

                  <div className="space-y-4">
                    {activePaperModal.parts.partC.questions.map((q) => (
                      <div
                        key={q.qNo}
                        className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="h-7 w-7 rounded-full bg-indigo-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {q.qNo}
                            </span>
                            <div>
                              <span className="font-extrabold text-[11px] text-indigo-900 uppercase tracking-wider block mb-1">
                                Comprehensive / Evaluative Higher-Order Problem
                              </span>
                              <p className="text-xs font-bold text-[#0B192C] leading-relaxed">
                                {q.text}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-black text-xs bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded shrink-0">
                            [15 Marks]
                          </span>
                        </div>

                        <div className="pl-10 text-[11px] bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                          <strong className="text-indigo-950 block">Scrutiny Rubric Guideline:</strong>
                          <p className="text-gray-600">{q.rubricHint}</p>
                        </div>

                        <div className="pl-10 flex items-center gap-2 text-[10px] font-mono font-bold">
                          <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                            CO: {q.co}
                          </span>
                          <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                            Bloom: {q.bloom}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Official QP Document View */}
              {activeModalTab === "officialPreview" && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-gray-300 shadow-inner font-serif text-[#0B192C] space-y-6 max-w-4xl mx-auto">
                  <div className="text-center border-b-2 border-gray-800 pb-4 space-y-1">
                    <p className="text-[10px] font-sans font-bold tracking-widest uppercase text-gray-500">
                      Reg. No. [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                    </p>
                    <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
                      Karpaga Vinayaga College of Engineering and Technology
                    </h2>
                    <p className="text-xs font-sans font-semibold text-gray-600">
                      (An Autonomous Institution • Affiliated to Anna University, Chennai)
                    </p>
                    <p className="text-xs font-sans font-extrabold uppercase tracking-wider text-[#0B192C] mt-2">
                      B.E. / B.Tech. DEGREE END SEMESTER EXAMINATIONS - MAY / JUNE 2026
                    </p>
                    <p className="text-xs font-sans font-bold">
                      {activePaperModal.semester} • {activePaperModal.department}
                    </p>
                    <p className="text-sm font-sans font-black mt-1">
                      {activePaperModal.subjectCode} - {activePaperModal.subjectTitle.toUpperCase()}
                    </p>
                    <p className="text-[11px] font-sans text-gray-600">
                      ({activePaperModal.regulation})
                    </p>
                    <div className="flex justify-between items-center text-xs font-sans font-extrabold pt-2">
                      <span>Time: 3 Hours</span>
                      <span className="font-mono">QP Code: {activePaperModal.qpCode}</span>
                      <span>Maximum: 100 Marks</span>
                    </div>
                  </div>

                  <div className="text-xs font-sans text-gray-600 border-b border-gray-200 pb-3 space-y-0.5">
                    <p><strong>General Instructions:</strong></p>
                    <p>1. Answer all questions from Part A, either (a) or (b) from each question in Part B, and the comprehensive question in Part C.</p>
                  </div>

                  {/* Document Questions */}
                  <div className="space-y-6 text-xs leading-relaxed">
                    <div>
                      <p className="font-sans font-black uppercase text-center border-b border-gray-300 pb-1 mb-3">
                        PART - A (10 × 2 = 20 Marks)
                      </p>
                      <div className="space-y-2">
                        {activePaperModal.parts.partA.questions.map((q) => (
                          <div key={q.qNo} className="flex justify-between gap-4">
                            <span>{q.qNo}. {q.text}</span>
                            <span className="font-mono text-[11px] font-bold shrink-0">({q.marks})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="font-sans font-black uppercase text-center border-b border-gray-300 pb-1 mb-3">
                        PART - B (5 × 13 = 65 Marks)
                      </p>
                      <div className="space-y-4">
                        {activePaperModal.parts.partB.questions.map((q) => (
                          <div key={q.qNo} className="space-y-2">
                            <div className="flex justify-between gap-4">
                              <span>{q.qNo}. (a) {q.optionA.text}</span>
                              <span className="font-mono text-[11px] font-bold shrink-0">(13)</span>
                            </div>
                            <p className="text-center font-sans font-bold text-gray-400 text-[10px]">-- OR --</p>
                            <div className="flex justify-between gap-4">
                              <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(b) {q.optionB.text}</span>
                              <span className="font-mono text-[11px] font-bold shrink-0">(13)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="font-sans font-black uppercase text-center border-b border-gray-300 pb-1 mb-3">
                        PART - C (1 × 15 = 15 Marks)
                      </p>
                      <div className="space-y-2">
                        {activePaperModal.parts.partC.questions.map((q) => (
                          <div key={q.qNo} className="flex justify-between gap-4">
                            <span>{q.qNo}. {q.text}</span>
                            <span className="font-mono text-[11px] font-bold shrink-0">({q.marks})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Seals */}
                  <div className="mt-8 pt-4 border-t-2 border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">1. Faculty Author:</p>
                      <p className="font-bold text-[#0B192C]">{activePaperModal.facultyName}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">2. HOD DAC Endorsement:</p>
                      <p className="font-bold text-[#0B192C]">{activePaperModal.hodName}</p>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-[10px] text-amber-800 uppercase font-bold">3. Associate Dean Scrutiny:</p>
                      <p className="font-black text-amber-950">{activePaperModal.adName}</p>
                      {activePaperModal.coeReferenceNo && (
                        <p className="text-[10px] font-mono text-purple-700 font-bold mt-1">
                          COE: {activePaperModal.coeReferenceNo}
                        </p>
                      )}
                      {activePaperModal.chiefCoeSealNo && (
                        <p className="text-[10px] font-mono text-emerald-800 font-black mt-0.5">
                          MASTER SEAL: {activePaperModal.chiefCoeSealNo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Faculty Uploaded PDF Document */}
              {activeModalTab === "pdf" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                        <FileText className="text-amber-800" size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#0B192C]">
                          {activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                        </h4>
                        <p className="text-xs text-slate-500">
                          File Size: {activePaperModal.pdfAttachment?.fileSize || "245 KB"} &bull; Uploaded by {activePaperModal.facultyName} on {activePaperModal.pdfAttachment?.uploadedAt || activePaperModal.dateSubmitted}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`,
                            fileData: activePaperModal.pdfAttachment?.fileData || "",
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Eye size={14} className="text-[#D4A72C]" />
                        <span>Full Screen PDF</span>
                      </button>
                      <a
                        href={activePdfUrl || undefined}
                        download={activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                        className="px-4 py-2 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black hover:bg-amber-400 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={14} />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 h-[650px]">
                    <iframe
                      src={activePdfUrl || undefined}
                      title={activePaperModal.pdfAttachment?.fileName || "Question Paper"}
                      className="w-full h-full rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Hierarchy Scrutiny & Forwarding Section */}
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border-2 border-[#E5E1D8] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#D4A72C]" />
                    <h3 className="font-display font-extrabold text-sm text-[#0B192C]">
                      Permission Clearance Actions: Stage {activePaperModal.currentStageNumber} ({activePaperModal.currentStageRole})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                    STAGE 3 ACADEMIC SCRUTINY CELL
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5">
                    Scrutiny Remarks &amp; Clearance Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={deanNotesInput}
                    onChange={(e) => setDeanNotesInput(e.target.value)}
                    placeholder="Enter observation notes, Bloom's level verification, or revision instructions..."
                    className="w-full text-xs font-medium p-3 bg-white border border-[#E5E1D8] rounded-xl text-[#0B192C] focus:outline-none focus:border-[#D4A72C]"
                  />
                </div>

                {/* Bottom Action Buttons along Hierarchy */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-gray-500">
                    Hierarchy Status:{" "}
                    <strong className="text-[#0B192C]">
                      {activePaperModal.status === "PENDING_AD_REVIEW"
                        ? "Stage 3 (Associate Dean Review)"
                        : activePaperModal.status === "PENDING_COE_REVIEW"
                        ? "Stage 4 (Transmitted to COE)"
                        : activePaperModal.status === "PENDING_CHIEF_COE"
                        ? "Stage 5 (With Chief COE Dr. Sathish)"
                        : activePaperModal.status === "CHIEF_COE_APPROVED"
                        ? "Stage 5 Complete (Master University Seal Release)"
                        : "Returned for Revision"}
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Return Options */}
                    {activePaperModal.status !== "CHIEF_COE_APPROVED" && (
                      <button
                        onClick={() => handleReturnPaper(activePaperModal.id, "HOD", deanNotesInput)}
                        disabled={isProcessingAction}
                        className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        <span>Return to HOD (Stage 2)</span>
                      </button>
                    )}

                    {/* Stage 3: AD Approves & Forwards to COE */}
                    {activePaperModal.currentStageNumber === 3 && activePaperModal.status === "PENDING_AD_REVIEW" && (
                      <button
                        onClick={() => handleAdApproveAndForwardToCOE(activePaperModal.id, deanNotesInput)}
                        disabled={isProcessingAction}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck size={16} />
                        <span>Approve &amp; Forward to COE (Stage 4)</span>
                      </button>
                    )}

                    {/* Stage 4: COE Forward to Chief COE Simulation */}
                    {activePaperModal.currentStageNumber === 4 && (
                      <button
                        onClick={() => handleCoeForwardToChiefCOE(activePaperModal.id)}
                        disabled={isProcessingAction}
                        className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Send size={15} />
                        <span>Endorse &amp; Forward to Chief COE (Stage 5)</span>
                      </button>
                    )}

                    {/* Stage 5: Chief COE Final Release Simulation */}
                    {activePaperModal.currentStageNumber === 5 && activePaperModal.status !== "CHIEF_COE_APPROVED" && (
                      <button
                        onClick={() => handleChiefCoeAuthorizeRelease(activePaperModal.id)}
                        disabled={isProcessingAction}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Crown size={16} />
                        <span>Chief COE Master Seal Release</span>
                      </button>
                    )}

                    {/* Print Preview */}
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-black transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} className="text-[#D4A72C]" />
                      <span>Print QP</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-[#0B192C]">
                  {confirmDialog.action === "forward_coe"
                    ? "Advance to Stage 4 (COE)?"
                    : confirmDialog.action === "forward_chief_coe"
                    ? "Advance to Stage 5 (Chief COE)?"
                    : "Authorize Master University Release?"}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {confirmDialog.paper.subjectCode} - {confirmDialog.paper.subjectTitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {confirmDialog.action === "forward_coe"
                ? `You are certifying that the question paper has passed Associate Dean academic scrutiny. An official COE dispatch reference will be generated and custody transferred to Controller of Examinations (Dr. N. Balasubramanian).`
                : confirmDialog.action === "forward_chief_coe"
                ? `COE verification complete. Paper is being forwarded to Chief COE (Dr. Sathish) for final executive clearance.`
                : `Chief COE Dr. Sathish is applying the final Master University Seal, authorizing official printing and examination conduction.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.action === "forward_coe") {
                    handleAdApproveAndForwardToCOE(confirmDialog.paper.id);
                  } else if (confirmDialog.action === "forward_chief_coe") {
                    handleCoeForwardToChiefCOE(confirmDialog.paper.id);
                  } else {
                    handleChiefCoeAuthorizeRelease(confirmDialog.paper.id);
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow transition cursor-pointer"
              >
                Confirm &amp; Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN PDF VIEWER MODAL */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in">
          <div className="bg-white max-w-5xl w-full h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="text-[#D4A72C]" size={20} />
                <div>
                  <h3 className="font-bold text-sm text-white">{pdfModalOpen.fileName}</h3>
                  <span className="text-[10px] text-slate-400">Stage 3 &bull; Associate Dean Academic Scrutiny &amp; Verification</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfModalOpen.fileData}
                  download={pdfModalOpen.fileName}
                  className="px-3 py-1.5 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black hover:bg-amber-400 transition flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setPdfModalOpen(null)}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={pdfModalOpen.fileData}
                title={pdfModalOpen.fileName}
                className="w-full h-full rounded-2xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionPaperReviewView;
