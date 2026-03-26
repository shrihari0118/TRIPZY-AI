from fastapi import FastAPI

app = FastAPI()


@app.get("/test-distance")
def test_distance():
    return get_distance("Chennai", "Coimbatore")