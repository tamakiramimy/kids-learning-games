import os
from pathlib import Path
from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("UI_BASE_URL", "http://127.0.0.1:3001/")
OUTPUT_DIR = Path("Temp-ChildrenGames/temp/ui-verification")
WORLD_CENTERS = (320, 640, 960)
WORLD_SCENES = ("MathGardenScene", "ForestCompareScene", "SoundHarborScene")
TRANSITION_SETTLE_MS = 320


def wait_for_scene(page, scene_key):
    page.wait_for_function(
        "sceneKey => window.__xingyaGame.scene.getScenes(true).some(scene => scene.scene.key === sceneKey)",
        arg=scene_key,
    )


def verify_desktop(page, console_errors):
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_selector("canvas")
    assert page.evaluate("window.__xingyaStore.getState().isMuted") is True
    page.wait_for_timeout(TRANSITION_SETTLE_MS)
    assert page.locator("canvas").count() == 1
    canvas_box = page.locator("canvas").bounding_box()
    assert canvas_box is not None
    assert canvas_box["width"] > 1000
    assert canvas_box["height"] > 600
    page.screenshot(path=str(OUTPUT_DIR / "map-desktop.png"))

    for index, (center_x, scene_key) in enumerate(zip(WORLD_CENTERS, WORLD_SCENES), start=1):
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_selector("canvas")
        wait_for_scene(page, "AdventureMapScene")
        page.mouse.click(center_x, 410)
        wait_for_scene(page, scene_key)
        page.wait_for_timeout(TRANSITION_SETTLE_MS)
        page.screenshot(path=str(OUTPUT_DIR / f"world-{index}.png"))
        page.mouse.click(64, 42)
        wait_for_scene(page, "AdventureMapScene")
        page.wait_for_timeout(TRANSITION_SETTLE_MS)
        page.screenshot(path=str(OUTPUT_DIR / f"return-{index}.png"))

    assert not console_errors, "\n".join(console_errors)


def verify_companion_book(browser):
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_selector("canvas")
        wait_for_scene(page, "AdventureMapScene")
        page.wait_for_function("window.__xingyaStore.persist.hasHydrated()")
        page.evaluate(
                """() => {
                    window.__xingyaStore.setState(state => ({
                        companionFragments: {
                            ...state.companionFragments,
                            math: 4,
                        },
                    }))
                }"""
        )
        page.wait_for_function(
                "window.__xingyaStore.getState().companionFragments.math === 4"
        )
        page.mouse.click(615, 51)
        wait_for_scene(page, "CompanionScene")
        companion_state = page.evaluate(
                """() => ({
                    status: window.__xingyaGame.scene.getScene('CompanionScene').cards[0].statusText.text,
                    fragments: window.__xingyaStore.getState().companionFragments.math,
                })"""
        )
        assert companion_state["status"] == "已成为探索伙伴", companion_state
        page.screenshot(path=str(OUTPUT_DIR / "companion-book.png"))
        page.mouse.click(72, 48)
        wait_for_scene(page, "AdventureMapScene")
        context.close()


def verify_reward_flow(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_selector("canvas")
    wait_for_scene(page, "AdventureMapScene")
    page.mouse.click(320, 410)
    wait_for_scene(page, "MathGardenScene")

    for expected_correct_count in range(1, 7):
        option = page.evaluate(
            """() => {
              const scene = window.__xingyaGame.scene.getScene('MathGardenScene')
              const optionIndex = scene.question.options.indexOf(scene.question.answer)
              const button = scene.optionButtons[optionIndex]
              return { x: button.x, y: button.y }
            }"""
        )
        page.mouse.click(option["x"], option["y"])
        page.wait_for_function(
            "expected => window.__xingyaStore.getState().nodeCorrect >= expected",
            arg=expected_correct_count,
        )
        if expected_correct_count < 6:
            page.wait_for_function(
                "expected => window.__xingyaStore.getState().nodeCorrect === expected && window.__xingyaGame.scene.getScenes(true).some(scene => scene.scene.key === 'MathGardenScene') && !window.__xingyaGame.scene.getScene('MathGardenScene').answering",
                arg=expected_correct_count,
            )

    wait_for_scene(page, "RewardScene")
    page.wait_for_timeout(1_100)
    page.screenshot(path=str(OUTPUT_DIR / "reward-next-step.png"))
    page.mouse.click(640, 600)
    wait_for_scene(page, "MathGardenScene")
    current_node = page.evaluate("window.__xingyaGame.scene.getScene('MathGardenScene').getActiveNode().id")
    assert current_node == "math-2", "reward primary action did not open the next node"
    page.screenshot(path=str(OUTPUT_DIR / "next-node.png"))
    context.close()


def verify_learning_hub(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_selector("canvas")
    wait_for_scene(page, "AdventureMapScene")
    assert page.evaluate("window.__xingyaStore.getState().isMuted") is True
    page.mouse.click(500, 51)
    wait_for_scene(page, "LearningHubScene")

    modules = [
        (269, 270, "pinyin"),
        (640, 270, "hanzi"),
        (1011, 270, "english-word"),
        (454, 510, "english-phrase"),
        (826, 510, "poetry"),
    ]
    for index, (x, y, module_id) in enumerate(modules, start=1):
        page.wait_for_timeout(TRANSITION_SETTLE_MS)
        page.mouse.click(x, y)
        wait_for_scene(page, "LearningQuestScene")
        page.wait_for_timeout(TRANSITION_SETTLE_MS)
        details = page.evaluate(
            """() => {
              const scene = window.__xingyaGame.scene.getScene('LearningQuestScene')
              return {
                moduleId: scene.moduleId,
                imageKey: scene.imageDisplay.texture.key,
                optionCount: scene.optionButtons.length,
              }
            }"""
        )
        assert details["moduleId"] == module_id
        assert details["imageKey"].startswith("learning-")
        assert details["optionCount"] == 3
        page.mouse.click(1170, 42)
        muted_feedback = page.evaluate(
            "window.__xingyaGame.scene.getScene('LearningQuestScene').feedbackText.text"
        )
        assert "声音已关闭" in muted_feedback
        page.screenshot(path=str(OUTPUT_DIR / f"learning-{index}.png"))
        page.mouse.click(72, 42)
        wait_for_scene(page, "LearningHubScene")

    page.mouse.click(72, 48)
    wait_for_scene(page, "AdventureMapScene")
    context.close()


def verify_relaxation_games(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_selector("canvas")
    wait_for_scene(page, "AdventureMapScene")
    page.mouse.click(385, 51)
    wait_for_scene(page, "RelaxationHubScene")

    games = [
        (384, 278, "ThunderFlightScene"),
        (896, 278, "WhackAMoleScene"),
        (384, 510, "RainbowBlocksScene"),
        (896, 510, "TinyRaceScene"),
    ]
    for index, (x, y, scene_key) in enumerate(games, start=1):
        page.mouse.click(x, y)
        wait_for_scene(page, scene_key)
        page.wait_for_timeout(TRANSITION_SETTLE_MS)
        if scene_key == "ThunderFlightScene":
            assert page.evaluate(
                "window.__xingyaGame.scene.getScene('ThunderFlightScene').gameStarted"
            ) is False
            page.mouse.click(640, 394)
            page.wait_for_function(
                "window.__xingyaGame.scene.getScene('ThunderFlightScene').gameStarted"
            )
            before_x = page.evaluate(
                "window.__xingyaGame.scene.getScene('ThunderFlightScene').player.x"
            )
            page.mouse.click(130, 666)
            page.wait_for_function(
                "beforeX => window.__xingyaGame.scene.getScene('ThunderFlightScene').player.x < beforeX",
                arg=before_x,
            )
            page.wait_for_function(
                "window.__xingyaGame.scene.getScene('ThunderFlightScene').enemyBullets.length > 0"
            )
            page.keyboard.press("p")
            page.wait_for_function(
                "window.__xingyaGame.scene.getScene('ThunderFlightScene').paused"
            )
            page.keyboard.press("Enter")
            page.wait_for_function(
                "!window.__xingyaGame.scene.getScene('ThunderFlightScene').paused"
            )
        elif scene_key == "WhackAMoleScene":
            assert page.evaluate(
                "window.__xingyaGame.scene.getScene('WhackAMoleScene').gameStarted"
            ) is False
            page.mouse.click(640, 394)
            page.wait_for_function(
                "window.__xingyaGame.scene.getScene('WhackAMoleScene').gameStarted"
            )
            mole_state = page.evaluate(
                """() => {
                  const scene = window.__xingyaGame.scene.getScene('WhackAMoleScene')
                  scene.spawnMole()
                  return {
                    slots: scene.slots.length,
                    timeLeft: scene.timeLeft,
                    selected: scene.selectedIndex,
                  }
                }"""
            )
            assert mole_state["slots"] == 9
            assert mole_state["timeLeft"] > 0
            assert mole_state["selected"] == 4
        elif scene_key == "RainbowBlocksScene":
            block_state = page.evaluate(
                """() => {
                  const scene = window.__xingyaGame.scene.getScene('RainbowBlocksScene')
                  return {
                    gameStatus: scene.engineState.gameStatus,
                    activeCells: scene.engineState.body.flat().filter(cell => cell.val === 1).length,
                    nextLabel: scene.nextText.text,
                  }
                }"""
            )
            assert block_state["gameStatus"] == 1
            assert block_state["activeCells"] > 0
            assert "Shape" not in block_state["nextLabel"]
            page.mouse.click(575, 666)
        else:
            page.mouse.click(640, 462)
            page.wait_for_function(
                "!window.__xingyaGame.scene.getScene('TinyRaceScene').tutorialOverlay"
            )
            before_lane = page.evaluate(
                "window.__xingyaGame.scene.getScene('TinyRaceScene').laneIndex"
            )
            page.keyboard.press("a")
            page.wait_for_function(
                "beforeLane => window.__xingyaGame.scene.getScene('TinyRaceScene').laneIndex < beforeLane",
                arg=before_lane,
            )
            page.keyboard.press("d")
            page.wait_for_function(
                "beforeLane => window.__xingyaGame.scene.getScene('TinyRaceScene').laneIndex === beforeLane",
                arg=before_lane,
            )
            page.mouse.click(130, 666)
            page.wait_for_function(
                "beforeLane => window.__xingyaGame.scene.getScene('TinyRaceScene').laneIndex < beforeLane",
                arg=before_lane,
            )
            road_state = page.evaluate(
                """() => {
                  const scene = window.__xingyaGame.scene.getScene('TinyRaceScene')
                  return {
                    rendererReady: Boolean(scene.raceRenderer),
                    laneSpacing: scene.raceRenderer.laneSpacing,
                    threeCanvasCount: document.querySelectorAll('canvas.race-three-canvas').length,
                    finishDistance: scene.finishDistance,
                  }
                }"""
            )
            assert road_state["rendererReady"]
            assert road_state["laneSpacing"] > 0
            assert road_state["threeCanvasCount"] == 1
            assert road_state["finishDistance"] > 0
            page.mouse.click(640, 420)
            page.wait_for_function(
                "window.__xingyaGame.scene.getScene('TinyRaceScene').laneIndex === 1"
            )
        page.screenshot(path=str(OUTPUT_DIR / f"relaxation-{index}.png"))
        page.mouse.click(42 if scene_key == "TinyRaceScene" else 72, 42)
        wait_for_scene(page, "RelaxationHubScene")
        if scene_key == "TinyRaceScene":
            page.wait_for_function("document.querySelectorAll('canvas.race-three-canvas').length === 0")

    page.mouse.click(72, 48)
    wait_for_scene(page, "AdventureMapScene")
    context.close()


def verify_order_challenge(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_selector("canvas")
    wait_for_scene(page, "AdventureMapScene")
    page.wait_for_function("window.__xingyaStore.persist.hasHydrated()")
    page.evaluate(
        """() => {
                    window.__xingyaStore.setState(state => ({
                        progress: {
                            ...state.progress,
                            comparison: {
                                ...state.progress.comparison,
                                unlockedNodeCount: 3,
                            },
                        },
                    }))
          window.__xingyaStore.getState().startNode('comparison', 'comparison-3')
          window.__xingyaGame.scene.start('ForestCompareScene')
        }"""
    )
    wait_for_scene(page, "ForestCompareScene")
    page.wait_for_timeout(TRANSITION_SETTLE_MS)

    choices = page.evaluate(
        """() => {
          const scene = window.__xingyaGame.scene.getScene('ForestCompareScene')
          return scene.answerValues.map((value, index) => ({
            value,
            index,
            x: scene.answerButtons[index].x,
            y: scene.answerButtons[index].y,
          }))
        }"""
    )
    for step, choice in enumerate(sorted(choices, key=lambda item: item["value"]), start=1):
        page.mouse.click(choice["x"], choice["y"])
        if step < len(choices):
            page.wait_for_function(
                "expected => window.__xingyaGame.scene.getScene('ForestCompareScene').orderStep === expected && !window.__xingyaGame.scene.getScene('ForestCompareScene').answering",
                arg=step,
            )
        else:
            page.wait_for_function(
                "expected => window.__xingyaStore.getState().nodeCorrect >= expected",
                arg=1,
            )
    page.screenshot(path=str(OUTPUT_DIR / "forest-order-complete.png"))
    context.close()


def verify_narrow_landscape(browser):
    context = browser.new_context(viewport={"width": 844, "height": 390})
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_selector("canvas")
    canvas_box = page.locator("canvas").bounding_box()
    assert canvas_box is not None
    page.screenshot(path=str(OUTPUT_DIR / "map-narrow-landscape.png"))
    assert canvas_box["width"] >= 640
    assert canvas_box["width"] <= 844
    assert canvas_box["height"] <= 390
    assert abs((canvas_box["width"] / canvas_box["height"]) - (16 / 9)) < 0.02
    context.close()


def verify_race_narrow_landscape(browser):
    context = browser.new_context(viewport={"width": 844, "height": 390})
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_selector("canvas")
    wait_for_scene(page, "AdventureMapScene")
    page.evaluate(
        """() => {
          window.__xingyaGame.scene.stop('AdventureMapScene')
          window.__xingyaGame.scene.start('TinyRaceScene')
        }"""
    )
    wait_for_scene(page, "TinyRaceScene")
    page.wait_for_function(
        "window.__xingyaGame.scene.getScene('TinyRaceScene').raceRenderer"
    )
    page.wait_for_timeout(TRANSITION_SETTLE_MS)
    phaser_canvas = page.locator("#game-container > canvas:not(.race-three-canvas)").bounding_box()
    three_canvas = page.locator("canvas.race-three-canvas").bounding_box()
    assert phaser_canvas is not None
    assert three_canvas is not None
    assert abs(phaser_canvas["x"] - three_canvas["x"]) < 1
    assert abs(phaser_canvas["y"] - three_canvas["y"]) < 1
    assert abs(phaser_canvas["width"] - three_canvas["width"]) < 1
    assert abs(phaser_canvas["height"] - three_canvas["height"]) < 1
    page.screenshot(path=str(OUTPUT_DIR / "race-narrow-landscape.png"))
    context.close()


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        console_errors = []
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        verify_desktop(page, console_errors)
        verify_companion_book(browser)
        verify_reward_flow(browser)
        verify_learning_hub(browser)
        verify_relaxation_games(browser)
        verify_order_challenge(browser)
        verify_narrow_landscape(browser)
        verify_race_narrow_landscape(browser)
        context.close()
        browser.close()
    print(f"UI verification passed. Screenshots: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()