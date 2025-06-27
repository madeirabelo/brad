from manim import *
import numpy as np
from manim import color_gradient

class MandelbrotCalculation(Scene):
    def construct(self):
        # Title
        title = Text("How Mandelbrot Fractal is Calculated", font_size=36)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(1)
        
        # Complex plane setup
        plane = ComplexPlane(
            x_range=[-2, 2, 0.5],  # symmetric real axis
            y_range=[-1.5, 1.5, 0.5],
            background_line_style={
                "stroke_color": TEAL,
                "stroke_width": 1,
                "stroke_opacity": 0.4
            },
            # Show coordinate labels for easier centering
            axis_config={"include_numbers": True, "font_size": 24},
        )
        plane.scale(1.5).shift(LEFT * 2)
        self.play(Create(plane))
        
        # Formula explanation
        formula = MathTex(r"z_{n+1} = z_n^2 + c")
        formula.to_edge(RIGHT).shift(UP * 2)
        self.play(Write(formula))
        
        # Explanation steps using MathTex
        steps = VGroup(
            MathTex(r"\text{Start with } z_0 = 0"),
            MathTex(r"\text{Iterate: } z_{n+1} = z_n^2 + c"),
            MathTex(r"\text{If } |z_n| > 2,\ \text{point escapes}"),
            MathTex(r"\text{Color based on escape time}")
        ).arrange(DOWN, aligned_edge=LEFT).scale(0.8).to_edge(RIGHT).shift(DOWN * 1)
        for step in steps:
            self.play(Write(step))
        
        # Fade out explanation steps and formula before showing calculation examples
        self.play(*[FadeOut(step) for step in steps], FadeOut(formula))
        
        # Test points
        test_points = [
            complex(-0.5, 0.5),    # Inside the set
            complex(-1, 0),        # Inside the set  
            complex(0.5, 0.5),     # Outside the set
            complex(1, 0),         # Outside the set
        ]
        
        colors = [RED, BLUE, GREEN, YELLOW]
        point_labels = ["A", "B", "C", "D"]
        
        # Show test points on plane
        dots = []
        labels = []
        for i, (c, color, label) in enumerate(zip(test_points, colors, point_labels)):
            dot = Dot(point=plane.c2p(c.real, c.imag), color=color, radius=0.04)
            label_text = Text(label, font_size=24, color=color)
            label_text.next_to(dot, UP, buff=0.1)
            
            dots.append(dot)
            labels.append(label_text)
            
            self.play(
                Create(dot),
                Write(label_text),
                run_time=0.5
            )
        
        self.wait(1)
        
        # Show calculation for each point
        for i, (c, color, label) in enumerate(zip(test_points, colors, point_labels)):
            # Highlight current point
            self.play(
                dots[i].animate.scale(1.5),
                run_time=0.5
            )
            
            # Show calculation steps
            calc_title = Text(f"Calculating for point {label}: c = {c.real:.1f} + {c.imag:.1f}i", 
                            font_size=32, color=color)
            calc_title.to_edge(LEFT).shift(UP * 2.5)
            self.play(Write(calc_title))
            
            # Determine if the point escapes with a higher max_iterations
            max_iterations = 50
            z = 0
            escaped = False
            for n in range(max_iterations):
                z = z * z + c
                if abs(z) > 2:
                    escaped = True
                    break

            # Show only the first 10 iterations in the animation
            z = 0
            iteration_texts = []
            for n in range(10):
                z = z * z + c
                if abs(z) > 2:
                    result = MathTex(rf"n={n}: |z_{{n}}| = {abs(z):.2f} > 2 \\rightarrow \text{{ESCAPES!}}", color=RED, font_size=28)
                    iteration_texts.append(result)
                    break
                else:
                    result = MathTex(rf"n={n}: z_{{n}} = {z.real:.2f} + {z.imag:.2f}i, |z_{{n}}| = {abs(z):.2f}", font_size=28)
                    iteration_texts.append(result)

            # Add the final result to the group
            if escaped:
                final_result = MathTex(rf"\\text{{Point {label}: ESCAPES (colored)}}", color=RED, font_size=28)
            else:
                final_result = MathTex(rf"\\text{{Point {label}: INSIDE SET (black)}}", font_size=28)
            iteration_texts.append(final_result)
            # Arrange all results in a VGroup and position as a block
            calc_block = VGroup(*iteration_texts).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
            calc_block.align_to(calc_title, UP).to_edge(RIGHT).shift(LEFT * 0.5)
            # Animate each line in order
            for result in calc_block:
                self.play(Write(result), run_time=0.3)
            self.wait(1)
            # Clean up for next point
            self.play(
                dots[i].animate.scale(1/1.5),
                FadeOut(calc_title),
                *[FadeOut(result) for result in calc_block],
                run_time=0.5
            )
        # Show the complete fractal
        self.play(
            FadeOut(title),
            FadeOut(formula),
            *[FadeOut(step) for step in steps],
            *[FadeOut(dot) for dot in dots],
            *[FadeOut(label) for label in labels],
            run_time=1
        )

        # Show the complete Mandelbrot fractal
        self.camera.background_color = BLUE_E
        
        # Create a new centered plane for the fractal
        fractal_plane = ComplexPlane(
            x_range=[-2, 2, 0.5],
            y_range=[-1.5, 1.5, 0.5],
            background_line_style={
                "stroke_color": TEAL,
                "stroke_width": 1,
                "stroke_opacity": 0.4
            },
            axis_config={"include_numbers": True, "font_size": 24},
        )
        fractal_plane.scale(1.5).move_to(ORIGIN)  # Centered on screen
        
        max_iterations = 50
        points = []
        gradient = color_gradient([BLACK, BLUE, GREEN, YELLOW, RED], max_iterations + 1)
        
        # Create all points at once with step size 0.01 for fine granularity
        for x in np.arange(-2, 2.01, 0.01):
            for y in np.arange(-2, 2.01, 0.01):
                c = complex(x, y)
                z = 0
                escape_time = max_iterations
                for i in range(max_iterations):
                    z = z * z + c
                    if abs(z) > 2:
                        escape_time = i
                        break
                color = gradient[escape_time]
                dot = Dot(point=fractal_plane.c2p(x, y), radius=0.15, color=color)  # Bigger dots
                points.append(dot)
        
        # Show all points at once
        all_points = VGroup(*points)
        self.play(Create(all_points), run_time=2)

        # Final title
        final_title = Text("Mandelbrot Fractal", font_size=36)
        final_title.to_edge(UP)
        self.play(Write(final_title))
        self.wait(3) 