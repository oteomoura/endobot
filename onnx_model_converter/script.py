import torch
import onnx
from transformers import AutoModel, AutoTokenizer
import os

# Define model path
model_path = "/root/.cache/huggingface/hub/BAAI_bge-large-en-v1.5/"
onnx_dir = os.path.expanduser("/root/.cache/huggingface/hub/BAAI_bge-large-en-v1.5/onnx")
os.makedirs(onnx_dir, exist_ok=True)

# Load model and tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModel.from_pretrained(model_path)

# Example input to trace the model
example_text = "Convert this model to ONNX"
inputs = tokenizer(example_text, return_tensors="pt")

# Export model to ONNX format
onnx_model_path = os.path.join(onnx_dir, "model.onnx")
torch.onnx.export(
    model,
    (inputs["input_ids"], inputs["attention_mask"]),
    onnx_model_path,
    input_names=["input_ids", "attention_mask"],
    output_names=["output"],
    dynamic_axes={"input_ids": {0: "batch_size", 1: "seq_len"},
                  "attention_mask": {0: "batch_size", 1: "seq_len"},
                  "output": {0: "batch_size", 1: "seq_len"}},
    opset_version=14,
)

print(f"✅ ONNX Model saved to: {onnx_model_path}")

# Validate the ONNX model
onnx_model = onnx.load(onnx_model_path)
onnx.checker.check_model(onnx_model)
print("✅ ONNX Model is valid!")