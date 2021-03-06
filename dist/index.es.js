function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if (typeof $$scope.dirty === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}
function set_input_value(input, value) {
    if (value != null || input.value) {
        input.value = value;
    }
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        callbacks.slice().forEach(fn => fn(event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function flush() {
    const seen_callbacks = new Set();
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                callback();
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, value = ret) => {
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

/* src/layouts/Container.svelte generated by Svelte v3.16.7 */

function add_css() {
	var style = element("style");
	style.id = "svelte-122jbc9-style";
	style.textContent = ".padding-s.svelte-122jbc9{padding:var(--bolg-spacer-s, 8px)}.padding-m.svelte-122jbc9{padding:var(--bolg-spacer-m, 16px)}.padding-l.svelte-122jbc9{padding:var(--bolg-spacer-l, 24px)}";
	append(document.head, style);
}

function create_fragment(ctx) {
	let div;
	let div_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", div_class_value = "" + (null_to_empty(`padding-${/*padding*/ ctx[0]}`) + " svelte-122jbc9"));
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
			}

			if (!current || dirty & /*padding*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(`padding-${/*padding*/ ctx[0]}`) + " svelte-122jbc9"))) {
				attr(div, "class", div_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { padding = "m" } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("padding" in $$props) $$invalidate(0, padding = $$props.padding);
		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	return [padding, $$scope, $$slots];
}

class Container extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-122jbc9-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { padding: 0 });
	}
}

/* src/layouts/Stack.svelte generated by Svelte v3.16.7 */

function add_css$1() {
	var style = element("style");
	style.id = "svelte-1en4j8n-style";
	style.textContent = ".stack.svelte-1en4j8n{display:grid;width:100%;box-sizing:border-box;grid-auto-columns:100%}.gap-s.svelte-1en4j8n{gap:var(--bolg-spacer-s, 8px)}.gap-m.svelte-1en4j8n{gap:var(--bolg-spacer-m, 16px)}.gap-l.svelte-1en4j8n{gap:var(--bolg-spacer-l, 24px)}.padding-none.svelte-1en4j8n{padding:0}.padding-s.svelte-1en4j8n{padding:var(--bolg-spacer-s, 8px)}.padding-m.svelte-1en4j8n{padding:var(--bolg-spacer-m, 16px)}.padding-l.svelte-1en4j8n{padding:var(--bolg-spacer-l, 24px)}";
	append(document.head, style);
}

function create_fragment$1(ctx) {
	let div;
	let div_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", div_class_value = "stack " + `gap-${/*gap*/ ctx[0]}` + " " + `padding-${/*padding*/ ctx[1]}` + " svelte-1en4j8n");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
			}

			if (!current || dirty & /*gap, padding*/ 3 && div_class_value !== (div_class_value = "stack " + `gap-${/*gap*/ ctx[0]}` + " " + `padding-${/*padding*/ ctx[1]}` + " svelte-1en4j8n")) {
				attr(div, "class", div_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { gap = "m" } = $$props;
	let { padding = "none" } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("gap" in $$props) $$invalidate(0, gap = $$props.gap);
		if ("padding" in $$props) $$invalidate(1, padding = $$props.padding);
		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
	};

	return [gap, padding, $$scope, $$slots];
}

class Stack extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1en4j8n-style")) add_css$1();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { gap: 0, padding: 1 });
	}
}

/* src/elements/Text.svelte generated by Svelte v3.16.7 */

function add_css$2() {
	var style = element("style");
	style.id = "svelte-10pz97j-style";
	style.textContent = ".text.font-sans.svelte-10pz97j{font-family:var(--bolg-font-family-sans, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\")}.text.font-serif.svelte-10pz97j{font-family:var(--bolg-font-family-serif, Georgia, Cambria, \"Times New Roman\", Times, serif)}.text.font-mono.svelte-10pz97j{font-family:var(--bolg-font-family-mono, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace)}.text.tone-normal.svelte-10pz97j{color:var(--bolg-text-color, #222222)}.text.tone-success.svelte-10pz97j{color:var(--bolg-success-color, #48bb78)}.text.tone-critical.svelte-10pz97j{color:var(--bolg-critical-color, #ef3d3d)}.text.size-s.svelte-10pz97j{font-size:var(--bolg-text-font-size-s, 14px)}.text.size-m.svelte-10pz97j{font-size:var(--bolg-text-font-size-m, 16px)}.text.size-l.svelte-10pz97j{font-size:var(--bolg-text-font-size-l, 18px)}";
	append(document.head, style);
}

function create_fragment$2(ctx) {
	let span;
	let span_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", span_class_value = "text " + `font-${/*font*/ ctx[0]}` + " " + `tone-${/*tone*/ ctx[1]}` + " " + `size-${/*size*/ ctx[2]}` + " svelte-10pz97j");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 8) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
			}

			if (!current || dirty & /*font, tone, size*/ 7 && span_class_value !== (span_class_value = "text " + `font-${/*font*/ ctx[0]}` + " " + `tone-${/*tone*/ ctx[1]}` + " " + `size-${/*size*/ ctx[2]}` + " svelte-10pz97j")) {
				attr(span, "class", span_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { font = "sans" } = $$props;
	let { tone = "normal" } = $$props;
	let { size = "m" } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("font" in $$props) $$invalidate(0, font = $$props.font);
		if ("tone" in $$props) $$invalidate(1, tone = $$props.tone);
		if ("size" in $$props) $$invalidate(2, size = $$props.size);
		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	return [font, tone, size, $$scope, $$slots];
}

class Text extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-10pz97j-style")) add_css$2();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { font: 0, tone: 1, size: 2 });
	}
}

/* src/elements/Heading.svelte generated by Svelte v3.16.7 */

function add_css$3() {
	var style = element("style");
	style.id = "svelte-jp3yo6-style";
	style.textContent = ".heading.svelte-jp3yo6{margin:0;color:var(--bolg-text-color, #222222);font-family:var(--bolg-font-family-sans, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\");font-weight:bold}.heading--1.svelte-jp3yo6{font-size:var(--bolg-heading-font-size-1, 28px)}.heading--2.svelte-jp3yo6{font-size:var(--bolg-heading-font-size-2, 24px)}.heading--3.svelte-jp3yo6{font-size:var(--bolg-heading-font-size-3, 20px)}.heading--4.svelte-jp3yo6{font-size:var(--bolg-heading-font-size-4, 18px)}.heading--5.svelte-jp3yo6{font-size:var(--bolg-heading-font-size-5, 16px)}";
	append(document.head, style);
}

// (23:29) 
function create_if_block_4(ctx) {
	let h5;
	let h5_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			h5 = element("h5");
			if (default_slot) default_slot.c();
			attr(h5, "class", h5_class_value = "heading " + `heading--${/*headingLevel*/ ctx[0]}` + " svelte-jp3yo6");
		},
		m(target, anchor) {
			insert(target, h5, anchor);

			if (default_slot) {
				default_slot.m(h5, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h5);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (19:29) 
function create_if_block_3(ctx) {
	let h4;
	let h4_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			h4 = element("h4");
			if (default_slot) default_slot.c();
			attr(h4, "class", h4_class_value = "heading " + `heading--${/*headingLevel*/ ctx[0]}` + " svelte-jp3yo6");
		},
		m(target, anchor) {
			insert(target, h4, anchor);

			if (default_slot) {
				default_slot.m(h4, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h4);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (15:29) 
function create_if_block_2(ctx) {
	let h3;
	let h3_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			h3 = element("h3");
			if (default_slot) default_slot.c();
			attr(h3, "class", h3_class_value = "heading " + `heading--${/*headingLevel*/ ctx[0]}` + " svelte-jp3yo6");
		},
		m(target, anchor) {
			insert(target, h3, anchor);

			if (default_slot) {
				default_slot.m(h3, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h3);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (11:29) 
function create_if_block_1(ctx) {
	let h2;
	let h2_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			h2 = element("h2");
			if (default_slot) default_slot.c();
			attr(h2, "class", h2_class_value = "heading " + `heading--${/*headingLevel*/ ctx[0]}` + " svelte-jp3yo6");
		},
		m(target, anchor) {
			insert(target, h2, anchor);

			if (default_slot) {
				default_slot.m(h2, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h2);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (7:0) {#if headingLevel === 1}
function create_if_block(ctx) {
	let h1;
	let h1_class_value;
	let current;
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			h1 = element("h1");
			if (default_slot) default_slot.c();
			attr(h1, "class", h1_class_value = "heading " + `heading--${/*headingLevel*/ ctx[0]}` + " svelte-jp3yo6");
		},
		m(target, anchor) {
			insert(target, h1, anchor);

			if (default_slot) {
				default_slot.m(h1, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h1);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$3(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;

	const if_block_creators = [
		create_if_block,
		create_if_block_1,
		create_if_block_2,
		create_if_block_3,
		create_if_block_4
	];

	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*headingLevel*/ ctx[0] === 1) return 0;
		if (/*headingLevel*/ ctx[0] === 2) return 1;
		if (/*headingLevel*/ ctx[0] === 3) return 2;
		if (/*headingLevel*/ ctx[0] === 4) return 3;
		if (/*headingLevel*/ ctx[0] === 5) return 4;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(target, anchor);
			}

			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if_block.p(ctx, dirty);
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d(detaching);
			}

			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { level = 1 } = $$props;
	const headingLevel = +level;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("level" in $$props) $$invalidate(1, level = $$props.level);
		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
	};

	return [headingLevel, level, $$scope, $$slots];
}

class Heading extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-jp3yo6-style")) add_css$3();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { level: 1 });
	}
}

/* src/elements/Button.svelte generated by Svelte v3.16.7 */

function add_css$4() {
	var style = element("style");
	style.id = "svelte-1cx6v9o-style";
	style.textContent = ".button.svelte-1cx6v9o{cursor:pointer;border:none;font-weight:500;display:flex;align-items:center;justify-content:center}.button.type-filled.svelte-1cx6v9o{border:none}.button.type-filled.tone-info.svelte-1cx6v9o{color:white;background-color:var(--bolg-info-color, #209cee);border:solid 2px var(--bolg-info-color, #209cee)}.button.type-filled.tone-success.svelte-1cx6v9o{color:white;background-color:var(--bolg-success-color, #48bb78);border:solid 2px var(--bolg-success-color, #48bb78)}.button.type-filled.tone-warning.svelte-1cx6v9o{color:var(--bolg-text-color, #222222);background-color:var(--bolg-warning-color, #f9db59);border:solid 2px var(--bolg-warning-color, #f9db59)}.button.type-filled.tone-critical.svelte-1cx6v9o{color:white;background-color:var(--bolg-critical-color, #ef3d3d);border:solid 2px var(--bolg-critical-color, #ef3d3d)}.button.type-filled.tone-info.svelte-1cx6v9o:disabled,.button.type-filled.tone-success.svelte-1cx6v9o:disabled,.button.type-filled.tone-warning.svelte-1cx6v9o:disabled,.button.type-filled.tone-critical.svelte-1cx6v9o:disabled{color:white;background-color:var(--bolg-disabled-color, #999999);border:solid 2px var(--bolg-disabled-color, #999999)}.button.type-outlined.svelte-1cx6v9o{background-color:white}.button.type-outlined.tone-info.svelte-1cx6v9o{color:var(--bolg-info-color, #209cee);border:solid 2px var(--bolg-info-color, #209cee)}.button.type-outlined.tone-success.svelte-1cx6v9o{color:var(--bolg-success-color, #48bb78);border:solid 2px var(--bolg-success-color, #48bb78)}.button.type-outlined.tone-warning.svelte-1cx6v9o{color:var(--bolg-warning-color, #f9db59);border:solid 2px var(--bolg-warning-color, #f9db59)}.button.type-outlined.tone-critical.svelte-1cx6v9o{color:var(--bolg-critical-color, #ef3d3d);border:solid 2px var(--bolg-critical-color, #ef3d3d)}.button.type-outlined.tone-info.svelte-1cx6v9o:disabled,.button.type-outlined.tone-success.svelte-1cx6v9o:disabled,.button.type-outlined.tone-warning.svelte-1cx6v9o:disabled,.button.type-outlined.tone-critical.svelte-1cx6v9o:disabled{color:var(--bolg-disabled-color, #999999);border:solid 2px var(--bolg-disabled-color, #999999)}.button.size-s.svelte-1cx6v9o{font-size:var(--bolg-text-font-size-s, 14px);padding:var(--bolg-spacer-xs, 4px) var(--bolg-spacer-s, 8px)}.button.size-m.svelte-1cx6v9o{font-size:var(--bolg-text-font-size-s, 14px);padding:var(--bolg-spacer-s, 8px) var(--bolg-spacer-m, 16px)}.button.size-l.svelte-1cx6v9o{font-size:var(--bolg-text-font-size-l, 18px);padding:var(--bolg-spacer-m, 16px) var(--bolg-spacer-l, 24px)}.icon.svelte-1cx6v9o{display:inline-block}.icon.type-filled.tone-info.svelte-1cx6v9o,.icon.type-filled.tone-success.svelte-1cx6v9o,.icon.type-filled.tone-critical.svelte-1cx6v9o{fill:white}.icon.type-filled.tone-warning.svelte-1cx6v9o{fill:var(--bolg-text-color, #222222)}.icon.type-filled.tone-info.disabled.svelte-1cx6v9o,.icon.type-filled.tone-success.disabled.svelte-1cx6v9o,.icon.type-filled.tone-warning.disabled.svelte-1cx6v9o,.icon.type-filled.tone-critical.disabled.svelte-1cx6v9o{fill:white}.icon.type-outlined.tone-info.svelte-1cx6v9o{fill:var(--bolg-info-color, #209cee)}.icon.type-outlined.tone-success.svelte-1cx6v9o{fill:var(--bolg-success-color, #48bb78)}.icon.type-outlined.tone-warning.svelte-1cx6v9o{fill:var(--bolg-warning-color, #f9db59)}.icon.type-outlined.tone-critical.svelte-1cx6v9o{fill:var(--bolg-critical-color, #ef3d3d)}.icon.type-outlined.tone-info.disabled.svelte-1cx6v9o,.icon.type-outlined.tone-success.disabled.svelte-1cx6v9o,.icon.type-outlined.tone-warning.disabled.svelte-1cx6v9o,.icon.type-outlined.tone-critical.disabled.svelte-1cx6v9o{fill:var(--bolg-disabled-color, #999999)}.icon.size-s.svelte-1cx6v9o{width:var(--bolg-text-font-size-m, 16px);height:var(--bolg-text-font-size-m, 16px);margin-right:var(--bolg-spacer-xs, 4px)}.icon.size-m.svelte-1cx6v9o{width:var(--bolg-text-font-size-m, 16px);height:var(--bolg-text-font-size-m, 16px);margin-right:var(--bolg-spacer-xs, 4px)}.icon.size-l.svelte-1cx6v9o{width:var(--bolg-text-font-size-l, 18px);height:var(--bolg-text-font-size-l, 18px);margin-right:var(--bolg-spacer-s, 8px)}";
	append(document.head, style);
}

// (10:2) {#if icon}
function create_if_block$1(ctx) {
	let span;
	let span_class_value;
	let current;
	var switch_value = /*icon*/ ctx[4];

	function switch_props(ctx) {
		return {};
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props());
	}

	return {
		c() {
			span = element("span");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			attr(span, "class", span_class_value = "icon " + `tone-${/*tone*/ ctx[0]}` + " " + `type-${/*type*/ ctx[1]}` + " " + `size-${/*size*/ ctx[2]}` + " " + (/*disabled*/ ctx[3] && "disabled") + " svelte-1cx6v9o");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (switch_instance) {
				mount_component(switch_instance, span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (switch_value !== (switch_value = /*icon*/ ctx[4])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, span, null);
				} else {
					switch_instance = null;
				}
			}

			if (!current || dirty & /*tone, type, size, disabled*/ 15 && span_class_value !== (span_class_value = "icon " + `tone-${/*tone*/ ctx[0]}` + " " + `type-${/*type*/ ctx[1]}` + " " + `size-${/*size*/ ctx[2]}` + " " + (/*disabled*/ ctx[3] && "disabled") + " svelte-1cx6v9o")) {
				attr(span, "class", span_class_value);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (switch_instance) destroy_component(switch_instance);
		}
	};
}

function create_fragment$4(ctx) {
	let button;
	let t;
	let button_class_value;
	let current;
	let dispose;
	let if_block = /*icon*/ ctx[4] && create_if_block$1(ctx);
	const default_slot_template = /*$$slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

	return {
		c() {
			button = element("button");
			if (if_block) if_block.c();
			t = space();
			if (default_slot) default_slot.c();
			attr(button, "class", button_class_value = "button " + `tone-${/*tone*/ ctx[0]}` + " " + `type-${/*type*/ ctx[1]}` + " " + `size-${/*size*/ ctx[2]}` + " svelte-1cx6v9o");
			button.disabled = /*disabled*/ ctx[3];
			dispose = listen(button, "click", /*click_handler*/ ctx[7]);
		},
		m(target, anchor) {
			insert(target, button, anchor);
			if (if_block) if_block.m(button, null);
			append(button, t);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (/*icon*/ ctx[4]) {
				if (if_block) {
					if_block.p(ctx, dirty);
					transition_in(if_block, 1);
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(button, t);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[5], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null));
			}

			if (!current || dirty & /*tone, type, size*/ 7 && button_class_value !== (button_class_value = "button " + `tone-${/*tone*/ ctx[0]}` + " " + `type-${/*type*/ ctx[1]}` + " " + `size-${/*size*/ ctx[2]}` + " svelte-1cx6v9o")) {
				attr(button, "class", button_class_value);
			}

			if (!current || dirty & /*disabled*/ 8) {
				button.disabled = /*disabled*/ ctx[3];
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (if_block) if_block.d();
			if (default_slot) default_slot.d(detaching);
			dispose();
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let { tone = "info" } = $$props;
	let { type = "filled" } = $$props;
	let { size = "m" } = $$props;
	let { disabled = false } = $$props;
	let { icon = null } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	function click_handler(event) {
		bubble($$self, event);
	}

	$$self.$set = $$props => {
		if ("tone" in $$props) $$invalidate(0, tone = $$props.tone);
		if ("type" in $$props) $$invalidate(1, type = $$props.type);
		if ("size" in $$props) $$invalidate(2, size = $$props.size);
		if ("disabled" in $$props) $$invalidate(3, disabled = $$props.disabled);
		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
	};

	return [tone, type, size, disabled, icon, $$scope, $$slots, click_handler];
}

class Button extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1cx6v9o-style")) add_css$4();

		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
			tone: 0,
			type: 1,
			size: 2,
			disabled: 3,
			icon: 4
		});
	}
}

/* src/elements/InputField.svelte generated by Svelte v3.16.7 */

function add_css$5() {
	var style = element("style");
	style.id = "svelte-444099-style";
	style.textContent = ".text-field.svelte-444099{display:flex;flex-flow:column nowrap;color:var(--bolg-text-color, #222222)}.label.svelte-444099{margin-bottom:var(--bolg-spacer-xs, 4px)}";
	append(document.head, style);
}

// (10:2) {#if label}
function create_if_block_1$1(ctx) {
	let div;
	let current;

	const text_1 = new Text({
			props: {
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			div = element("div");
			create_component(text_1.$$.fragment);
			attr(div, "class", "label svelte-444099");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(text_1, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope, label*/ 20) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(text_1);
		}
	};
}

// (12:6) <Text>
function create_default_slot_1(ctx) {
	let t;

	return {
		c() {
			t = text(/*label*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*label*/ 4) set_data(t, /*label*/ ctx[2]);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (16:2) {#if message}
function create_if_block$2(ctx) {
	let current;

	const text_1 = new Text({
			props: {
				tone: /*tone*/ ctx[0],
				size: "s",
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};
			if (dirty & /*tone*/ 1) text_1_changes.tone = /*tone*/ ctx[0];

			if (dirty & /*$$scope, message*/ 18) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (17:4) <Text {tone} size="s">
function create_default_slot(ctx) {
	let t;

	return {
		c() {
			t = text(/*message*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*message*/ 2) set_data(t, /*message*/ ctx[1]);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$5(ctx) {
	let label_1;
	let t0;
	let t1;
	let current;
	let if_block0 = /*label*/ ctx[2] && create_if_block_1$1(ctx);
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
	let if_block1 = /*message*/ ctx[1] && create_if_block$2(ctx);

	return {
		c() {
			label_1 = element("label");
			if (if_block0) if_block0.c();
			t0 = space();
			if (default_slot) default_slot.c();
			t1 = space();
			if (if_block1) if_block1.c();
			attr(label_1, "class", "text-field svelte-444099");
		},
		m(target, anchor) {
			insert(target, label_1, anchor);
			if (if_block0) if_block0.m(label_1, null);
			append(label_1, t0);

			if (default_slot) {
				default_slot.m(label_1, null);
			}

			append(label_1, t1);
			if (if_block1) if_block1.m(label_1, null);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*label*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
					transition_in(if_block0, 1);
				} else {
					if_block0 = create_if_block_1$1(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(label_1, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
			}

			if (/*message*/ ctx[1]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
					transition_in(if_block1, 1);
				} else {
					if_block1 = create_if_block$2(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(label_1, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(default_slot, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(default_slot, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(label_1);
			if (if_block0) if_block0.d();
			if (default_slot) default_slot.d(detaching);
			if (if_block1) if_block1.d();
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let { tone = "normal" } = $$props;
	let { message = null } = $$props;
	let { label = null } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("tone" in $$props) $$invalidate(0, tone = $$props.tone);
		if ("message" in $$props) $$invalidate(1, message = $$props.message);
		if ("label" in $$props) $$invalidate(2, label = $$props.label);
		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
	};

	return [tone, message, label, $$slots, $$scope];
}

class InputField extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-444099-style")) add_css$5();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, { tone: 0, message: 1, label: 2 });
	}
}

/* src/elements/TextField.svelte generated by Svelte v3.16.7 */

function add_css$6() {
	var style = element("style");
	style.id = "svelte-6p43b2-style";
	style.textContent = ".input.svelte-6p43b2{width:100%;font-size:16px;padding:var(--bolg-spacer-s, 8px);box-sizing:border-box}.input.input-tone-normal.svelte-6p43b2{border:solid 1px var(--bold-border-color, #888888)}.input.input-tone-success.svelte-6p43b2{border:solid 1px var(--bolg-success-color, #48bb78)}.input.input-tone-critical.svelte-6p43b2{border:solid 1px var(--bolg-critical-color, #ef3d3d)}.input.svelte-6p43b2::-webkit-input-placeholder{color:var(--bolg-placeholder-color, #aaaaaa)}.input.svelte-6p43b2::-moz-placeholder{color:var(--bolg-placeholder-color, #aaaaaa)}.input.svelte-6p43b2:-ms-input-placeholder{color:var(--bolg-placeholder-color, #aaaaaa)}.input.svelte-6p43b2::-ms-input-placeholder{color:var(--bolg-placeholder-color, #aaaaaa)}.input.svelte-6p43b2::placeholder{color:var(--bolg-placeholder-color, #aaaaaa)}";
	append(document.head, style);
}

// (11:0) <InputField {label} {message} {tone}>
function create_default_slot$1(ctx) {
	let input;
	let input_class_value;
	let dispose;

	return {
		c() {
			input = element("input");
			attr(input, "class", input_class_value = "input " + `input-tone-${/*tone*/ ctx[1]}` + " svelte-6p43b2");
			attr(input, "type", "text");
			attr(input, "placeholder", /*placeholder*/ ctx[4]);
			dispose = listen(input, "input", /*input_input_handler*/ ctx[5]);
		},
		m(target, anchor) {
			insert(target, input, anchor);
			set_input_value(input, /*value*/ ctx[0]);
		},
		p(ctx, dirty) {
			if (dirty & /*tone*/ 2 && input_class_value !== (input_class_value = "input " + `input-tone-${/*tone*/ ctx[1]}` + " svelte-6p43b2")) {
				attr(input, "class", input_class_value);
			}

			if (dirty & /*placeholder*/ 16) {
				attr(input, "placeholder", /*placeholder*/ ctx[4]);
			}

			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
				set_input_value(input, /*value*/ ctx[0]);
			}
		},
		d(detaching) {
			if (detaching) detach(input);
			dispose();
		}
	};
}

function create_fragment$6(ctx) {
	let current;

	const inputfield = new InputField({
			props: {
				label: /*label*/ ctx[3],
				message: /*message*/ ctx[2],
				tone: /*tone*/ ctx[1],
				$$slots: { default: [create_default_slot$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(inputfield.$$.fragment);
		},
		m(target, anchor) {
			mount_component(inputfield, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const inputfield_changes = {};
			if (dirty & /*label*/ 8) inputfield_changes.label = /*label*/ ctx[3];
			if (dirty & /*message*/ 4) inputfield_changes.message = /*message*/ ctx[2];
			if (dirty & /*tone*/ 2) inputfield_changes.tone = /*tone*/ ctx[1];

			if (dirty & /*$$scope, tone, placeholder, value*/ 83) {
				inputfield_changes.$$scope = { dirty, ctx };
			}

			inputfield.$set(inputfield_changes);
		},
		i(local) {
			if (current) return;
			transition_in(inputfield.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(inputfield.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(inputfield, detaching);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let { tone = "normal" } = $$props;
	let { message = null } = $$props;
	let { label = null } = $$props;
	let { value = "" } = $$props;
	let { placeholder = "" } = $$props;

	function input_input_handler() {
		value = this.value;
		$$invalidate(0, value);
	}

	$$self.$set = $$props => {
		if ("tone" in $$props) $$invalidate(1, tone = $$props.tone);
		if ("message" in $$props) $$invalidate(2, message = $$props.message);
		if ("label" in $$props) $$invalidate(3, label = $$props.label);
		if ("value" in $$props) $$invalidate(0, value = $$props.value);
		if ("placeholder" in $$props) $$invalidate(4, placeholder = $$props.placeholder);
	};

	return [value, tone, message, label, placeholder, input_input_handler];
}

class TextField extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-6p43b2-style")) add_css$6();

		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
			tone: 1,
			message: 2,
			label: 3,
			value: 0,
			placeholder: 4
		});
	}
}

/* src/elements/Textarea.svelte generated by Svelte v3.16.7 */

function add_css$7() {
	var style = element("style");
	style.id = "svelte-f3h6g6-style";
	style.textContent = ".textarea.svelte-f3h6g6{width:100%;font-size:16px;padding:var(--bolg-spacer-s, 8px);box-sizing:border-box}.textarea.textarea-tone-normal.svelte-f3h6g6{border:solid 1px var(--bold-border-color, #888888)}.textarea.textarea-tone-success.svelte-f3h6g6{border:solid 1px var(--bolg-success-color, #48bb78)}.textarea.textarea-tone-critical.svelte-f3h6g6{border:solid 1px var(--bolg-critical-color, #ef3d3d)}";
	append(document.head, style);
}

// (12:0) <InputField {label} {message} {tone}>
function create_default_slot$2(ctx) {
	let textarea;
	let textarea_class_value;
	let dispose;

	return {
		c() {
			textarea = element("textarea");
			attr(textarea, "class", textarea_class_value = "textarea " + `textarea-tone-${/*tone*/ ctx[1]}` + " svelte-f3h6g6");
			attr(textarea, "type", "text");
			attr(textarea, "placeholder", /*placeholder*/ ctx[5]);
			attr(textarea, "rows", /*rows*/ ctx[4]);
			dispose = listen(textarea, "input", /*textarea_input_handler*/ ctx[6]);
		},
		m(target, anchor) {
			insert(target, textarea, anchor);
			set_input_value(textarea, /*value*/ ctx[0]);
		},
		p(ctx, dirty) {
			if (dirty & /*tone*/ 2 && textarea_class_value !== (textarea_class_value = "textarea " + `textarea-tone-${/*tone*/ ctx[1]}` + " svelte-f3h6g6")) {
				attr(textarea, "class", textarea_class_value);
			}

			if (dirty & /*placeholder*/ 32) {
				attr(textarea, "placeholder", /*placeholder*/ ctx[5]);
			}

			if (dirty & /*rows*/ 16) {
				attr(textarea, "rows", /*rows*/ ctx[4]);
			}

			if (dirty & /*value*/ 1) {
				set_input_value(textarea, /*value*/ ctx[0]);
			}
		},
		d(detaching) {
			if (detaching) detach(textarea);
			dispose();
		}
	};
}

function create_fragment$7(ctx) {
	let current;

	const inputfield = new InputField({
			props: {
				label: /*label*/ ctx[3],
				message: /*message*/ ctx[2],
				tone: /*tone*/ ctx[1],
				$$slots: { default: [create_default_slot$2] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(inputfield.$$.fragment);
		},
		m(target, anchor) {
			mount_component(inputfield, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const inputfield_changes = {};
			if (dirty & /*label*/ 8) inputfield_changes.label = /*label*/ ctx[3];
			if (dirty & /*message*/ 4) inputfield_changes.message = /*message*/ ctx[2];
			if (dirty & /*tone*/ 2) inputfield_changes.tone = /*tone*/ ctx[1];

			if (dirty & /*$$scope, tone, placeholder, rows, value*/ 179) {
				inputfield_changes.$$scope = { dirty, ctx };
			}

			inputfield.$set(inputfield_changes);
		},
		i(local) {
			if (current) return;
			transition_in(inputfield.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(inputfield.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(inputfield, detaching);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let { tone = "normal" } = $$props;
	let { message = null } = $$props;
	let { label = null } = $$props;
	let { rows = 5 } = $$props;
	let { value = "" } = $$props;
	let { placeholder = "" } = $$props;

	function textarea_input_handler() {
		value = this.value;
		$$invalidate(0, value);
	}

	$$self.$set = $$props => {
		if ("tone" in $$props) $$invalidate(1, tone = $$props.tone);
		if ("message" in $$props) $$invalidate(2, message = $$props.message);
		if ("label" in $$props) $$invalidate(3, label = $$props.label);
		if ("rows" in $$props) $$invalidate(4, rows = $$props.rows);
		if ("value" in $$props) $$invalidate(0, value = $$props.value);
		if ("placeholder" in $$props) $$invalidate(5, placeholder = $$props.placeholder);
	};

	return [value, tone, message, label, rows, placeholder, textarea_input_handler];
}

class Textarea extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-f3h6g6-style")) add_css$7();

		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
			tone: 1,
			message: 2,
			label: 3,
			rows: 4,
			value: 0,
			placeholder: 5
		});
	}
}

/* src/elements/Link.svelte generated by Svelte v3.16.7 */

function add_css$8() {
	var style = element("style");
	style.id = "svelte-1cc5uee-style";
	style.textContent = ".link.svelte-1cc5uee{color:var(--bolg-text-color, #222222)}";
	append(document.head, style);
}

function create_fragment$8(ctx) {
	let a;
	let current;
	const default_slot_template = /*$$slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
	let a_levels = [{ class: "link" }, { href: /*href*/ ctx[0] }, /*newTabAttrs*/ ctx[1]];
	let a_data = {};

	for (let i = 0; i < a_levels.length; i += 1) {
		a_data = assign(a_data, a_levels[i]);
	}

	return {
		c() {
			a = element("a");
			if (default_slot) default_slot.c();
			set_attributes(a, a_data);
			toggle_class(a, "svelte-1cc5uee", true);
		},
		m(target, anchor) {
			insert(target, a, anchor);

			if (default_slot) {
				default_slot.m(a, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot && default_slot.p && dirty & /*$$scope*/ 8) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
			}

			set_attributes(a, get_spread_update(a_levels, [
				{ class: "link" },
				dirty & /*href*/ 1 && ({ href: /*href*/ ctx[0] }),
				dirty & /*newTabAttrs*/ 2 && /*newTabAttrs*/ ctx[1]
			]));

			toggle_class(a, "svelte-1cc5uee", true);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(a);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let { href } = $$props;
	let { newTab = false } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("href" in $$props) $$invalidate(0, href = $$props.href);
		if ("newTab" in $$props) $$invalidate(2, newTab = $$props.newTab);
		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	let newTabAttrs;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*newTab*/ 4) {
			 $$invalidate(1, newTabAttrs = newTab ? { target: "_blank", rel: "noopener" } : {});
		}
	};

	return [href, newTabAttrs, newTab, $$scope, $$slots];
}

class Link extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1cc5uee-style")) add_css$8();
		init(this, options, instance$8, create_fragment$8, safe_not_equal, { href: 0, newTab: 2 });
	}
}

/* src/elements/CodeBlock.svelte generated by Svelte v3.16.7 */

function add_css$9() {
	var style = element("style");
	style.id = "svelte-kp1yec-style";
	style.textContent = ".code-block.svelte-kp1yec{background-color:var(--bolg-text-color, #222222);color:white}.pre.svelte-kp1yec{margin:0;padding:var(--bolg-spacer-m, 16px);box-sizing:border-box;overflow-x:scroll}.code.svelte-kp1yec{font-size:var(--bolg-text-font-size-s, 14px);font-family:var(--bolg-font-family-mono, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace);line-height:1.5}";
	append(document.head, style);
}

function create_fragment$9(ctx) {
	let div;
	let pre;
	let code_1;
	let t;

	return {
		c() {
			div = element("div");
			pre = element("pre");
			code_1 = element("code");
			t = text(/*code*/ ctx[0]);
			attr(code_1, "class", "code svelte-kp1yec");
			attr(pre, "class", "pre svelte-kp1yec");
			attr(div, "class", "code-block svelte-kp1yec");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, pre);
			append(pre, code_1);
			append(code_1, t);
		},
		p(ctx, [dirty]) {
			if (dirty & /*code*/ 1) set_data(t, /*code*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let { code } = $$props;

	$$self.$set = $$props => {
		if ("code" in $$props) $$invalidate(0, code = $$props.code);
	};

	return [code];
}

class CodeBlock extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-kp1yec-style")) add_css$9();
		init(this, options, instance$9, create_fragment$9, safe_not_equal, { code: 0 });
	}
}

export { Button, CodeBlock, Container, Heading, Link, Stack, Text, TextField, Textarea };
