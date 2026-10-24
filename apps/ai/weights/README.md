# Anti-spoofing model weights

| File | Original model | Face crop |
| --- | --- | --- |
| `minifasnet_v2_scale2.7.onnx` | `2.7_80x80_MiniFASNetV2.pth` | 2.7× the face box, resized to 80×80 |
| `minifasnet_v1se_scale4.0.onnx` | `4_0_0_80x80_MiniFASNetV1SE.pth` | 4× the face box, resized to 80×80 |

**Source:** [minivision-ai/Silent-Face-Anti-Spoofing](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing),
`resources/anti_spoof_models/`. Copyright Minivision, licensed under the
**Apache License 2.0** — see `LICENSE` in this folder.

**Modification:** the PyTorch weights were converted to ONNX (opset 13,
`torch.onnx.export`) without changing them. The converted models were checked
against the PyTorch originals on random inputs (max difference ≈ 0.000002).

**Input:** `[N, 3, 80, 80]` float32, raw 0–255 pixel values in BGR order
(no normalisation). **Output:** 3 logits; after softmax, index 1 = "real face".
