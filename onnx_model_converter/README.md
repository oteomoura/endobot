### ONNX Model Converter

This is a short script I had to write in order to convert the BAAI_bge-large-en-v1.5
model downloaded from Hugging Face to the ONNX format so the `@huggingface/transformers` library could work with it.

 #### How does it work?

  When we build the container, Docker will fetch model files from Hugging Face:
```

# Create model directory and download necessary files

RUN mkdir -p $TRANSFORMERS_CACHE/hub/BAAI_bge-large-en-v1.5 && \

cd $TRANSFORMERS_CACHE/hub/BAAI_bge-large-en-v1.5 && \

wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/config.json && \

wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/tokenizer.json && \

wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/tokenizer_config.json && \

wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/special_tokens_map.json && \

wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/vocab.txt && \

wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/model.safetensors

```

However, when we try to run `AutoTokenizer.from_pretrained` or `AutoModel.from_pretrained` passing in that folder as a source, the `@huggingface` library won't be able to read it. Since it can't read it, it tries to download the model online but it doesn't seem to find an equivalent to the one we're using.
I did try to force it load from a local model using the 
`local_files_only: true, trust_remote_code: false` flags, but it still tried to download from the repository anyway.  So the best solution I found was to convert the model to ONNX, which is what this script is doing. 

 #### When should it run?

The ONNX model needs to be available before the rest of the app runs, so it runs 
as a step inside the Dockerfile
