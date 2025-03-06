# Endobot
<img src="https://github.com/user-attachments/assets/ab03a0d7-fd3e-4c96-88a9-23f8db90190c" height="200" >

Endobot is an open-source AI-based WhatsApp chatbot specializing in endometriosis, chronic pain, and women's health. It is designed to provide information, support, and guidance to individuals navigating these conditions.

## 📌 About the Project

Endobot is being developed as part of the **Endopolítica** initiative ([Instagram](https://instagram.com/endopolitica)), co-founded by my wife and me. Our mission is to empower and support women at all stages of their journey with endometriosis—whether they are in the early investigation phase, undergoing treatment, or recovering from surgery.

This project is supported by the **StartBSB** program at **Fundação de Apoio à Pesquisa do Distrito Federal (FAP/DF)**, a government-led research funding agency.

## 🚀 Features

- **AI-Powered Assistance**: Uses NLP and contextual understanding to provide relevant responses.
- **WhatsApp Integration**: Built to run on WhatsApp for easy accessibility.
- **Domain-Specific Knowledge**: Trained with information tailored to endometriosis and chronic pain management.
- **Context-Aware Conversations**: Maintains conversation history for personalized support.

## 🔄 Project Status & Roadmap

This project is still in an **active early development stage**. We plan to incorporate **Retrieval-Augmented Generation (RAG) features** soon to enhance the chatbot's ability to provide accurate and context-aware responses.

We use **Docker** for deployment on **Digital Ocean** servers to ensure scalability and ease of maintenance.

### Next Steps

1. **Finishing early feature development**
2. **Implement unit tests**
3. **Implement CI/CD with GitHub Actions**
4. **Provide a demo**

## 🏗️ Tech Stack

- **Backend**: Node.js (Express.js)
- **Database**: Supabase
- **Vector Store**: Supabase for storing message embeddings
- **AI Model Hosting**: Baseten
- **Messaging API**: Twilio (WhatsApp integration)
- **Deployment**: Docker on Digital Ocean

## 📖 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [Supabase](https://supabase.com/)
- [Twilio](https://www.twilio.com/)
- [Docker](https://www.docker.com/)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/teogenesmoura/endobot.git
   cd endobot
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables (`.env` file):
   ```sh
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
4. Start the server:
   ```sh
   npm start
   ```

## ❓ FAQ

### 1. Why not just use the OpenAI models and library?

We want to keep the project as flexible as possible to allow for quick iteration and adaptation to user needs. By not tying ourselves exclusively to OpenAI, we retain the ability to explore a variety of models, including those that are more cost-effective or better suited for specialized tasks. Additionally, avoiding strict dependency on OpenAI at this stage allows us to maintain greater control over data privacy, performance tuning, and deployment strategies. However, this decision is not final—we remain open to integrating OpenAI's tools if they align well with our long-term goals and user needs.

### 2. Can I contribute?

We'll release a contribution guide soon! 

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Acknowledgments

- **Endopolítica Community** – for their insights and continuous support.
- **FAP/DF & StartBSB** – for funding and supporting the project.
- **Open-source Contributors** – for making this initiative possible!

---

💙 _Together, we can provide better support for those navigating endometriosis and chronic pain!_
