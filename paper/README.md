# Research paper — PhotoMatch AI

`main.tex` is the manuscript, written with the `IEEEtran` conference class
(two columns, IEEE reference style). `main.pdf` is the compiled result.

```text
main.tex            the paper
refs.bib            57 references (IEEE style via IEEEtran.bst)
figures/            TikZ diagrams (fig_*.tex) and graphs (graph_*.pdf)
data/               raw measurements (JSON) behind every graph and number
experiments/        scripts that produced data/ and the graphs
build.sh            builds main.pdf
```

## Build the PDF

Needs TeX Live with `IEEEtran`, TikZ and BibTeX (Ubuntu: `sudo apt install texlive-publishers texlive-latex-extra texlive-science texlive-pictures texlive-fonts-recommended latexmk`).
On [Overleaf](https://www.overleaf.com), upload the folder as a project and set `main.tex` as the main file.

```bash
./build.sh        # writes paper/main.pdf
```

## Before you submit

* Fill in the author block (department, institution, city, country) and the acknowledgment in `main.tex`.
* Compare each reference once with IEEE Xplore or the venue page; page ranges that differed between sources were left out on purpose.
* Check the target venue's page limit (the paper is 10 pages) and its policy on AI-assisted writing. The acknowledgment already discloses the use of an AI assistant; edit it so it states what is true for you.

## What the numbers are — and are not

Everything measured by us comes from `data/*.json` and was produced on one 4-vCPU machine
(Xeon 2.30 GHz, no GPU; PostgreSQL 16.15, pgvector 0.6.0, ONNX Runtime 1.23.2).

* **Measured:** per-stage latency, embedding stability under controlled degradations (9 identities), face-size limit,
  exact vs. HNSW vector search on *synthetic* embeddings, AI-service throughput, test-suite results.
* **Quoted from the original papers (Table I), not measured:** LFW/IJB-C accuracy of the model family.
* **Not evaluated:** recognition accuracy on LFW, IJB-C or an event-like labelled collection; a labelled
  presentation-attack protocol (APCER/BPCER); demographic differences. The paper says so explicitly.
  The sandbox that produced the paper had no access to those datasets.

## Reproduce the experiments

```bash
# 0. services: PostgreSQL with pgvector (a database called `paperbench`), AI models in apps/ai/models
# 1. sample images in one folder: group.jpg, real.jpg, print_attack.jpg (downloaded by apps/ai/tests),
#    obama.jpg obama2.jpg obama3.jpg biden.jpg (tests/test_images of the `face_recognition` package)
apps/ai/.venv/bin/python paper/experiments/ai_latency.py     --images IMAGES   # Fig. 6
apps/ai/.venv/bin/python paper/experiments/ai_robustness.py  --images IMAGES   # Figs. 7-8
apps/ai/.venv/bin/python paper/experiments/ai_liveness.py    --images IMAGES   # Sec. VII-F
python paper/experiments/pgvector_bench.py all                                 # Fig. 9, Table II (needs psycopg, pgvector, numpy)
apps/ai/.venv/bin/python paper/experiments/http_throughput.py --image IMAGES/group.jpg   # Fig. 10
python paper/experiments/make_figures.py                                       # redraws graph_*.pdf (needs matplotlib)
```

The three sample portraits and the group photo are third-party images and are not stored in the repository.

To add a real LFW result later, evaluate the ONNX pipeline in `apps/ai/app/face_engine.py` on the
official LFW pairs (10-fold protocol), then add a measured row to Table I and update the abstract and Section VIII.
