# Automated-Candidate-Interview-Evaluation-System

1. Create a virtual environment:
   ```bash
   conda create -n interview_eval_env python=3.12 -y 

2. Activate the virtual environment:
    ```bash
    conda activate interview_eval_env
   ```

3. Install the required packages:
   ```bash
    pip install -r requirements.txt
    pip install -r requirements.txt
    ```

4. Set up environment variables:
    - Copy `.env.example` to `.env`:
      ```bash
      cp .env.example .env
      ```
    - Open `.env` and add your OpenAI API key:
      ```
      OPENAI_API_KEY=your_key_here
      ```


run the application:
   ```bash
   uvicorn app:app --reload
   ```



